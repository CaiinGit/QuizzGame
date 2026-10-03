import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { connectDatabase, type Sql } from "./database";
import { QuestionBank } from "./question-bank";
import { questions } from "./questions";
import { difficultyChoices } from "../shared/difficulty";

test("difficulty counts and draws exclude drafts, archives and disabled themes, with an exact ten-question threshold", async () => {
  const db = await isolatedDatabase(),
    bank = new QuestionBank(db);
  try {
    await bank.init();
    for (const difficulty of difficultyChoices.slice(1)) {
      if (difficulty === "all") continue;
      for (let i = 0; i < 12; i++)
        await bank.saveQuestion({
          ...questions[i % 10],
          id: `${difficulty}-${i}`,
          themeId: "one-piece",
          difficulty,
          status: i < 9 ? "published" : i === 9 ? "draft" : "archived",
        });
      assert.equal(
        (await bank.availability()).find((v) => v.difficulty === difficulty)
          ?.available,
        false,
      );
      await assert.rejects(
        bank.drawQuestions("one-piece", difficulty),
        /10 questions publiées/,
      );
      await bank.saveQuestion({
        ...questions[0],
        id: `${difficulty}-9`,
        themeId: "one-piece",
        difficulty,
        status: "published",
      });
      const option = (await bank.availability()).find(
        (v) => v.difficulty === difficulty,
      )!;
      assert.equal(option.count, 10);
      assert.equal(option.available, true);
      const drawn = await bank.drawQuestions("one-piece", difficulty);
      assert.equal(drawn.length, 10);
      assert.equal(new Set(drawn.map((q) => q.id)).size, 10);
      assert.ok(drawn.every((q) => q.id.startsWith(`${difficulty}-`)));
    }
    assert.equal((await bank.availability())[0].count, 60);
    await db.query(
      "UPDATE akasha_themes SET enabled=false WHERE id='one-piece'",
    );
    assert.ok(
      (await bank.availability()).every((o) => o.count === 0 && !o.available),
    );
    await assert.rejects(bank.drawQuestions("one-piece", "easy"));
  } finally {
    await db.close();
  }
});

async function isolatedDatabase(): Promise<Sql> {
  if (!process.env.TEST_DATABASE_URL) return connectDatabase();
  const schema = `bank_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL,
  });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL,
    options: `-c search_path=${schema}`,
  });
  return {
    query: async <T>(sql: string, params?: unknown[]) => ({
      rows: (await pool.query(sql, params)).rows as T[],
    }),
    close: async () => {
      await pool.end();
      try {
        await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      } finally {
        await admin.end();
      }
    },
  };
}

test("question bank: one-time seed, editorial validation, eligibility and restart preservation", async () => {
  const db = await isolatedDatabase();
  const bank = new QuestionBank(db);
  try {
    await bank.init();
    const initial = await bank.drawQuestions();
    assert.equal(initial.length, 10);
    assert.equal(new Set(initial.map((q) => q.id)).size, 10);
    for (const q of initial)
      assert.deepEqual(
        q,
        questions.find((seed) => seed.id === q.id),
      );

    const draft = await bank.saveQuestion({ themeId: "one-piece" });
    assert.equal(draft.status, "draft");
    assert.equal(draft.correct, null);
    assert.equal(
      (await bank.drawQuestions()).some((q) => q.id === draft.id),
      false,
    );
    await assert.rejects(bank.saveQuestion({ ...draft, status: "published" }));
    await assert.rejects(
      db.query("UPDATE akasha_questions SET status='published' WHERE id=$1", [
        draft.id,
      ]),
    );
    const replacement = {
      ...draft,
      text: "Question de test",
      choices: ["A", "B", "C", "D"],
      correct: 2,
      status: "published" as const,
      difficulty: "medium" as const,
      explanation: "Explication de test",
      source: "Référence de test",
    };
    await assert.rejects(
      bank.saveQuestion({ ...replacement, choices: [" A ", "a", "C", "D"] }),
    );
    await assert.rejects(
      bank.saveQuestion({ ...replacement, themeId: "missing" }),
    );
    await bank.saveQuestion(replacement);
    await bank.saveQuestion({
      ...questions[0],
      themeId: "one-piece",
      status: "archived",
    });
    const selected = await bank.drawQuestions();
    assert.equal(selected.length, 10);
    assert.ok(selected.some((q) => q.id === draft.id && q.correct === 2));
    assert.ok(selected.every((q) => q.id !== questions[0].id));

    await bank.saveQuestion({
      ...questions[1],
      themeId: "one-piece",
      text: "Énoncé modifié",
      status: "published",
    });
    await db.query("DELETE FROM akasha_questions WHERE id=$1", [
      questions[2].id,
    ]);
    await new QuestionBank(db).init();
    const { rows } = await db.query<{
      id: string;
      text: string;
      status: string;
    }>("SELECT id,text,status FROM akasha_questions");
    assert.equal(
      rows.find((q) => q.id === questions[0].id)?.status,
      "archived",
    );
    assert.equal(
      rows.find((q) => q.id === questions[1].id)?.text,
      "Énoncé modifié",
    );
    assert.equal(
      rows.some((q) => q.id === questions[2].id),
      false,
    );
    await assert.rejects(bank.drawQuestions(), /10 questions publiées/);
    await bank.saveQuestion({
      ...questions[2],
      themeId: "one-piece",
      status: "published",
    });
    await db.query(
      "UPDATE akasha_themes SET enabled=false WHERE id='one-piece'",
    );
    await assert.rejects(bank.drawQuestions(), /10 questions publiées/);
    await assert.rejects(
      bank.drawQuestions("missing"),
      /10 questions publiées/,
    );
  } finally {
    await db.close();
  }
});
