import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Sql } from "./database";
import { questions as starterQuestions, type Question } from "./questions";
import {
  difficultyChoices,
  difficultyLabels,
  type DifficultyChoice,
  type DifficultyAvailability,
} from "../shared/difficulty";

export const questionInput = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .default(() => randomUUID()),
    themeId: z.string().trim().min(1).max(100),
    text: z.string().trim().max(2000).default(""),
    choices: z.array(z.string().trim().max(500)).max(4).default([]),
    correct: z.number().int().min(0).max(3).nullable().default(null),
    explanation: z.string().trim().max(4000).default(""),
    difficulty: z
      .enum(["easy", "medium", "hard", "very_hard", "expert"])
      .nullable()
      .default(null),
    spoilerUntil: z.string().trim().max(500).default(""),
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    source: z.string().trim().max(2000).default(""),
  })
  .superRefine((q, ctx) => {
    if (q.status !== "published") return;
    if (
      !q.text ||
      q.choices.length !== 4 ||
      q.choices.some((c) => !c) ||
      q.correct === null ||
      new Set(q.choices.map((c) => c.toLocaleLowerCase("fr"))).size !== 4
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Une question publiée nécessite un énoncé, quatre réponses distinctes et une bonne réponse.",
      });
  });

/** Private server storage. Never expose this repository or answer keys to clients. */
export class QuestionBank {
  constructor(private db: Sql) {}

  async init() {
    await this.db.query(`CREATE TABLE IF NOT EXISTS akasha_migrations (
      id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS akasha_themes (
      id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
      enabled BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS akasha_questions (
      id TEXT PRIMARY KEY, theme_id TEXT NOT NULL REFERENCES akasha_themes(id),
      text TEXT NOT NULL DEFAULT '' CHECK (length(text) <= 2000),
      choices TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(choices) <= 4 AND array_position(choices,NULL) IS NULL)
        CHECK (cardinality(choices) = 0 OR (array_ndims(choices) = 1 AND array_lower(choices,1) = 1)),
      correct SMALLINT CHECK (correct BETWEEN 0 AND 3),
      explanation TEXT NOT NULL DEFAULT '' CHECK (length(explanation) <= 4000),
      difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
      source TEXT NOT NULL DEFAULT '' CHECK (length(source) <= 2000),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT published_question_complete CHECK (status <> 'published' OR (
        length(btrim(text)) > 0 AND cardinality(choices) = 4 AND correct IS NOT NULL
        AND length(btrim(choices[1])) > 0 AND length(btrim(choices[2])) > 0
        AND length(btrim(choices[3])) > 0 AND length(btrim(choices[4])) > 0
        AND lower(btrim(choices[1])) <> lower(btrim(choices[2]))
        AND lower(btrim(choices[1])) <> lower(btrim(choices[3]))
        AND lower(btrim(choices[1])) <> lower(btrim(choices[4]))
        AND lower(btrim(choices[2])) <> lower(btrim(choices[3]))
        AND lower(btrim(choices[2])) <> lower(btrim(choices[4]))
        AND lower(btrim(choices[3])) <> lower(btrim(choices[4]))
      )))`);
    await this.db.query(
      `CREATE INDEX IF NOT EXISTS akasha_questions_theme_status ON akasha_questions(theme_id,status)`,
    );
    await this.db.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM akasha_migrations WHERE id='question-sheets-v1') THEN
        ALTER TABLE akasha_questions DROP CONSTRAINT akasha_questions_difficulty_check;
        ALTER TABLE akasha_questions ADD CONSTRAINT akasha_questions_difficulty_check
          CHECK (difficulty IN ('easy','medium','hard','very_hard','expert'));
        ALTER TABLE akasha_questions ADD COLUMN spoiler_until TEXT NOT NULL DEFAULT '' CHECK(length(spoiler_until)<=500);
        ALTER TABLE akasha_questions ADD COLUMN sheet_id TEXT;
        ALTER TABLE akasha_questions ADD COLUMN sheet_question_id TEXT;
        CREATE UNIQUE INDEX akasha_questions_sheet_id ON akasha_questions(sheet_id,sheet_question_id);
        CREATE TABLE akasha_question_sync (
          sheet_id TEXT PRIMARY KEY, attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          succeeded_at TIMESTAMPTZ, report JSONB NOT NULL DEFAULT '{}');
        INSERT INTO akasha_migrations(id) VALUES ('question-sheets-v1');
      END IF;
    END $$`);
    // A single statement makes the seed and its marker atomic on PostgreSQL/PGlite.
    // Restarting must never resurrect deleted questions or overwrite editorial work.
    await this.db.query(
      `WITH migration AS (
      INSERT INTO akasha_migrations(id) VALUES ('question-bank-v1')
      ON CONFLICT DO NOTHING RETURNING id
    ), theme AS (
      INSERT INTO akasha_themes(id,name,enabled)
      SELECT 'one-piece','One Piece',true FROM migration
      ON CONFLICT DO NOTHING RETURNING id
    )
    INSERT INTO akasha_questions(id,theme_id,text,choices,correct,explanation,status)
    SELECT item->>'id','one-piece',item->>'text',
      ARRAY(SELECT jsonb_array_elements_text(item->'choices')),
      (item->>'correct')::smallint,item->>'explanation','published'
    FROM jsonb_array_elements($1::jsonb) AS item
    WHERE EXISTS (SELECT 1 FROM migration)
    ON CONFLICT DO NOTHING`,
      [JSON.stringify(starterQuestions)],
    );
  }

  async saveQuestion(input: z.input<typeof questionInput>) {
    const q = questionInput.parse(input);
    await this.db.query(
      `INSERT INTO akasha_questions
      (id,theme_id,text,choices,correct,explanation,difficulty,status,source,spoiler_until)
      VALUES ($1,$2,$3,$4::text[],$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id) DO UPDATE SET theme_id=excluded.theme_id,text=excluded.text,
      choices=excluded.choices,correct=excluded.correct,explanation=excluded.explanation,
      difficulty=excluded.difficulty,status=excluded.status,source=excluded.source,
      spoiler_until=excluded.spoiler_until,updated_at=now()`,
      [
        q.id,
        q.themeId,
        q.text,
        q.choices,
        q.correct,
        q.explanation,
        q.difficulty,
        q.status,
        q.source,
        q.spoilerUntil,
      ],
    );
    return q;
  }

  async availability(themeId = "one-piece"): Promise<DifficultyAvailability> {
    const { rows } = await this.db.query<{
      difficulty: string | null;
      count: string;
    }>(
      `SELECT q.difficulty,count(*) AS count FROM akasha_questions q JOIN akasha_themes t ON t.id=q.theme_id
       WHERE q.theme_id=$1 AND q.status='published' AND t.enabled GROUP BY q.difficulty`,
      [themeId],
    );
    return difficultyChoices.map((difficulty) => {
      const count = rows
        .filter((r) => difficulty === "all" || r.difficulty === difficulty)
        .reduce((sum, r) => sum + Number(r.count), 0);
      return { difficulty, count, available: count >= 10 };
    });
  }

  async drawQuestions(
    themeId = "one-piece",
    difficulty: DifficultyChoice = "all",
  ): Promise<Question[]> {
    const { rows } = await this.db.query<Question>(
      `SELECT q.id,q.text,q.choices,q.correct,q.explanation
      FROM akasha_questions q JOIN akasha_themes t ON t.id=q.theme_id
      WHERE q.theme_id=$1 AND q.status='published' AND t.enabled
      AND ($2='all' OR q.difficulty=$2)
      ORDER BY random() LIMIT 10`,
      [themeId, difficulty],
    );
    if (rows.length < 10)
      throw new Error(
        difficulty === "all"
          ? "Ce thème ne contient pas encore 10 questions publiées. Réessaie plus tard."
          : `Le niveau ${difficultyLabels[difficulty]} ne contient pas encore 10 questions publiées. Choisis une autre difficulté.`,
      );
    return rows;
  }
}
