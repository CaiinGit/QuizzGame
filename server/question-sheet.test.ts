import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { connectDatabase, type Sql } from "./database";
import { QuestionBank } from "./question-bank";
import {
  applySheetPreview,
  parseCsv,
  previewSheets,
  questionTabs,
  readQuestionSheets,
  synchronizeQuestions,
} from "./question-sheet";

const sheetId = "test_spreadsheet_identifier_12345";
const headings = [
  "Difficulté",
  "Question",
  "Bonne réponse",
  "Mauvaise réponse 1",
  "Mauvaise réponse 2",
  "Mauvaise réponse 3",
  "Spoiler jusqu’à",
  "Explication",
  "ID",
  "Statut",
];
const csv = (rows: string[][]) =>
  rows
    .map((row) => row.map((c) => `"${c.replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
const row = (id: string, level = "Facile", status = "Publié") => [
  level,
  `Question ${id} ?`,
  "Oui",
  "Non",
  "Peut-être",
  "Jamais",
  "Wano",
  "Une explication, avec\nun retour et des « accents ». ",
  id,
  status,
];
const sheets = () =>
  questionTabs.map((name, i) => ({
    name,
    csv: csv([headings, row(`OP-${i + 1}`, name)]),
  }));

test("sheet CSV preserves accents, quotes, commas and multiline cells", () => {
  assert.deepEqual(
    parseCsv('\uFEFF"a","b"\r\n"dit ""oui""","une\r\nligne,é"\r\n'),
    [
      ["a", "b"],
      ['dit "oui"', "une\r\nligne,é"],
    ],
  );
  assert.deepEqual(parseCsv("a,b\n1,"), [
    ["a", "b"],
    ["1", ""],
  ]);
  assert.throws(() => parseCsv('a,"unfinished'));
  assert.throws(() => parseCsv('"a"trailing,b'));
});

test("sheet preview validates publication, immutable IDs, all tabs and global duplicates", () => {
  const input = sheets(),
    valid = previewSheets(sheetId, input);
  assert.equal(valid.report.ok, true);
  assert.equal(valid.records.length, 5);
  assert.deepEqual(
    valid.records.map((q) => q.difficulty),
    ["easy", "medium", "hard", "very_hard", "expert"],
  );
  assert.ok(
    valid.records.every((q) => q.correct === 0 && q.spoilerUntil === "Wano"),
  );
  input[0].csv = csv([
    headings,
    row("NEW", "Facile", "Brouillon"),
    row("OP-1"),
  ]);
  assert.equal(
    previewSheets(sheetId, input).records.find((q) => q.externalId === "OP-1")
      ?.id,
    valid.records[0].id,
  );
  input[1].csv = csv([headings, row("OP-1", "Intermédiaire")]);
  assert.equal(previewSheets(sheetId, input).report.ok, false);
  assert.equal(previewSheets(sheetId, input).records.length, 0);
  assert.equal(previewSheets(sheetId, sheets().slice(1)).report.ok, false);
  input[0].csv = csv([headings.slice(0, 8), row("ID").slice(0, 8)]);
  assert.match(
    previewSheets(sheetId, input).report.issues[0].message,
    /ID, Statut/,
  );
  const invalid = row("OP-1");
  invalid[3] = " OUI ";
  const draft = row("DRAFT", "Facile", "");
  draft[1] = "";
  draft[2] = "";
  const noId = row("");
  const badStatus = row("WRONG", "Facile", "Public");
  input.splice(0, input.length, ...sheets());
  input[0].csv = csv([headings, invalid, draft, noId, badStatus]);
  const partial = previewSheets(sheetId, input);
  assert.equal(partial.report.ok, true);
  assert.equal(partial.report.issues.length, 3);
  assert.equal(
    partial.records.find((q) => q.externalId === "DRAFT")?.status,
    "draft",
  );
  assert.ok(!partial.records.some((q) => q.externalId === "OP-1"));
});

test("reader rejects permission errors and HTML responses; requests five explicit tabs", async () => {
  const calls: string[] = [];
  const request = (async (url: URL) => {
    calls.push(url.searchParams.get("sheet")!);
    return new Response(
      sheets().find((t) => t.name === url.searchParams.get("sheet"))!.csv,
      { headers: { "content-type": "text/csv; charset=utf-8" } },
    );
  }) as typeof fetch;
  const preview = await readQuestionSheets(sheetId, request);
  assert.equal(preview.records.length, 5);
  assert.deepEqual(calls, [...questionTabs]);
  await assert.rejects(readQuestionSheets("../../bad", request));
  await assert.rejects(
    readQuestionSheets(
      sheetId,
      (async () => new Response("Login", { status: 403 })) as typeof fetch,
    ),
  );
  await assert.rejects(
    readQuestionSheets(
      sheetId,
      (async () =>
        new Response("Login", {
          headers: { "content-type": "text/html" },
        })) as typeof fetch,
    ),
  );
});

async function isolatedDatabase(): Promise<Sql> {
  if (!process.env.TEST_DATABASE_URL) return connectDatabase();
  const schema = `sheets_test_${randomUUID().replaceAll("-", "")}`;
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

test("database sync is atomic, idempotent and preserves existing questions through errors, sorting and deletion", async () => {
  const db = await isolatedDatabase(),
    bank = new QuestionBank(db);
  try {
    await bank.init();
    const original = await bank.drawQuestions();
    const input = sheets();
    let preview = previewSheets(sheetId, input);
    assert.equal((await applySheetPreview(db, sheetId, preview)).changed, 5);
    assert.equal((await applySheetPreview(db, sheetId, preview)).changed, 0);
    const query = () =>
      db.query<{
        id: string;
        text: string;
        status: string;
        spoiler_until: string;
      }>(
        "SELECT id,text,status,spoiler_until FROM akasha_questions WHERE sheet_id=$1 ORDER BY id",
        [sheetId],
      );
    const before = await query();
    assert.equal(before.rows.length, 5);
    const updated = row("OP-1");
    updated[1] = "Correction du texte";
    input[0].csv = csv([headings, row("OP-6"), updated]);
    assert.equal(
      (await applySheetPreview(db, sheetId, previewSheets(sheetId, input)))
        .changed,
      2,
    );
    assert.equal((await query()).rows.length, 6);
    assert.equal(
      (await query()).rows.find((q) => q.id === preview.records[0].id)?.text,
      "Correction du texte",
    );
    input[0].csv = csv([headings, row("OP-6", "Facile", "Archivé")]);
    await applySheetPreview(db, sheetId, previewSheets(sheetId, input));
    assert.equal((await query()).rows.length, 6); // Deleted row is retained, explicit archive works.
    assert.equal(
      (await query()).rows.filter((q) => q.status === "archived").length,
      1,
    );
    const saved = await query();
    input[0].csv = csv([headings, row("OP-2")]); // Same ID as second tab.
    assert.equal(
      (await applySheetPreview(db, sheetId, previewSheets(sheetId, input))).ok,
      false,
    );
    assert.deepEqual(await query(), saved);
    assert.equal(
      (
        await synchronizeQuestions(db, sheetId, async () => {
          throw new Error("Google unavailable");
        })
      ).ok,
      false,
    );
    assert.deepEqual(await query(), saved);
    // Force a DB failure after parsing: the single statement rolls back all valid rows too.
    preview = previewSheets(sheetId, sheets());
    preview.records[0].text = "Must roll back";
    preview.records[1].status = "invalid" as "published";
    await assert.rejects(applySheetPreview(db, sheetId, preview));
    assert.deepEqual(await query(), saved);
    await bank.init();
    assert.deepEqual(await query(), saved);
    const seeds = await db.query<{ id: string }>(
      "SELECT id FROM akasha_questions WHERE sheet_id IS NULL",
    );
    assert.deepEqual(
      seeds.rows.map((q) => q.id).sort(),
      original.map((q) => q.id).sort(),
    );
    assert.ok(original.every((q) => !q.text.includes("Correction"))); // Existing game snapshots unchanged.
  } finally {
    await db.close();
  }
});
