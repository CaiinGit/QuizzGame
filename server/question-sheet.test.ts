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
  questionSources,
  questionSheetLayout,
} from "./question-sheet";

const sheetId = "test_spreadsheet_identifier_12345";
test("source configuration requires distinct documents and known themes, with legacy compatibility", () => {
  const mcu = "another_spreadsheet_identifier_12345";
  assert.deepEqual(questionSources({ AKASHA_QUESTION_SHEET_ID: sheetId }), [
    { themeId: "one-piece", sheetId },
  ]);
  assert.deepEqual(
    questionSources({
      AKASHA_QUESTION_SHEETS: JSON.stringify({ "one-piece": sheetId, mcu }),
    }).map((s) => s.themeId),
    ["one-piece", "mcu"],
  );
  assert.throws(() =>
    questionSources({
      AKASHA_QUESTION_SHEETS: JSON.stringify({
        "one-piece": sheetId,
        mcu: sheetId,
      }),
    }),
  );
  assert.throws(() =>
    questionSources({
      AKASHA_QUESTION_SHEETS: JSON.stringify({ unknown: sheetId }),
    }),
  );
});
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

const catalogHeadings = [
  "ID",
  "Difficulté",
  "Question",
  "Bonne réponse",
  "Proposition 2",
  "Proposition 3",
  "Proposition 4",
  "Explication",
  "Image (URL)",
  "Statut",
];
const catalogRows = () => [
  ["Nom du thème", "One Piece", "Préfixe ID", "OP"],
  ["Les identifiants sont attribués lors de l’insertion."],
  [...catalogHeadings],
  [
    "OP-0001",
    "Facile",
    "Une question ?",
    "A",
    "B",
    "C",
    "D",
    "Explication",
    "",
    "Publié",
  ],
  ["OP-0002", "Professionnel", "", "", "", "", "", "", "", "Brouillon"],
];
test("catalog reads row-three headers, mixed levels and draft status without importing editor tabs", async () => {
  assert.equal(questionSheetLayout(), "levels");
  assert.equal(questionSheetLayout("catalog"), "catalog");
  assert.throws(() => questionSheetLayout("other"));
  const calls: string[] = [];
  const request = (async (url: URL) => {
    calls.push(url.searchParams.get("sheet")!);
    return new Response(csv(catalogRows()), {
      headers: { "content-type": "text/csv" },
    });
  }) as typeof fetch;
  const result = await readQuestionSheets(
    sheetId,
    request,
    "one-piece",
    "catalog",
  );
  assert.deepEqual(calls, ["QUESTIONS"]);
  assert.deepEqual(result.report, {
    ok: true,
    rows: 2,
    imported: 2,
    issues: [],
  });
  assert.equal(result.records[0].spoilerUntil, "");
  assert.deepEqual(result.records[0].choices, ["A", "B", "C", "D"]);
  assert.equal(result.records[1].status, "draft");
  assert.equal(result.records[1].difficulty, "expert");
  // Editing/reordering rows cannot change the stable ID.
  const rows = catalogRows();
  rows[3][2] = "Correction de texte";
  const changed = previewSheets(
    sheetId,
    [{ name: "QUESTIONS", csv: csv(rows) }],
    "one-piece",
    "catalog",
  );
  assert.equal(changed.records[0].id, result.records[0].id);
});
test("catalog rejects duplicate IDs and malformed headers and reports physical row numbers", () => {
  const preview = (rows: string[][]) =>
    previewSheets(
      sheetId,
      [{ name: "QUESTIONS", csv: csv(rows) }],
      "one-piece",
      "catalog",
    );
  const rows = catalogRows();
  rows[4][0] = rows[3][0];
  assert.equal(preview(rows).report.ok, false);
  assert.equal(preview(rows).records.length, 0);
  const badHeaders = catalogRows();
  badHeaders[2][4] = "Incorrect";
  assert.equal(preview(badHeaders).report.ok, false);
  const duplicates = catalogRows();
  duplicates[2].push("Mauvaise réponse 1");
  assert.equal(preview(duplicates).report.ok, false);
  const invalid = catalogRows();
  invalid[3][1] = "Inconnu";
  assert.equal(preview(invalid).report.issues[0].row, 4);
  assert.equal(preview(invalid).records.length, 1);
  const firstTabFallback = [
    ["Formulaire d’insertion"],
    ["Ne pas importer"],
    ["Question", "Réponse"],
  ];
  assert.equal(preview(firstTabFallback).report.ok, false);
});

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
    const mcuId = "mcu_spreadsheet_identifier_12345";
    const mcu = previewSheets(mcuId, sheets(), "mcu");
    assert.equal((await applySheetPreview(db, mcuId, mcu, "mcu")).changed, 5);
    assert.equal((await applySheetPreview(db, mcuId, mcu, "mcu")).changed, 0);
    assert.deepEqual(await query(), saved);
    assert.equal((await bank.availability("mcu"))[0].count, 5);
    assert.ok(
      mcu.records.every(
        (q) => q.themeId === "mcu" && !saved.rows.some((r) => r.id === q.id),
      ),
    );
    await assert.rejects(
      applySheetPreview(
        db,
        sheetId,
        previewSheets(sheetId, sheets(), "mcu"),
        "mcu",
      ),
      /autre thème/,
    );
    await assert.rejects(
      applySheetPreview(db, mcuId, mcu, "one-piece"),
      /ne correspond/,
    );
    await bank.init();
    assert.equal((await bank.availability("mcu"))[0].count, 5);
    assert.deepEqual(await query(), saved);
  } finally {
    await db.close();
  }
});
