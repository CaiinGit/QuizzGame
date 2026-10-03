import { createHash } from "node:crypto";
import type { z } from "zod";
import type { Sql } from "./database";
import { questionInput } from "./question-bank";

export const questionTabs = [
  "Facile",
  "Intermédiaire",
  "Difficile",
  "Très difficile",
  "Professionnel",
] as const;
const normalize = (value: string) =>
  value
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[’']/g, "'");
const levels = new Map<
  string,
  "easy" | "medium" | "hard" | "very_hard" | "expert"
>([
  ["facile", "easy"],
  ["intermediaire", "medium"],
  ["difficile", "hard"],
  ["tres difficile", "very_hard"],
  ["professionnel", "expert"],
]);
const statuses = new Map<string, "draft" | "published" | "archived">([
  ["", "draft"],
  ["brouillon", "draft"],
  ["publie", "published"],
  ["archive", "archived"],
]);
const headers = [
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
export interface SheetIssue {
  tab: string;
  row?: number;
  message: string;
}
export interface SheetRecord extends z.output<typeof questionInput> {
  externalId: string;
}
export interface SheetReport {
  ok: boolean;
  rows: number;
  imported: number;
  changed?: number;
  issues: SheetIssue[];
}
export interface SheetPreview {
  records: SheetRecord[];
  report: SheetReport;
}

/** RFC 4180 fields, including escaped quotes and multiline explanations. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
    } else if (c === "," || c === "\n" || c === "\r") {
      row.push(field);
      field = "";
      closed = false;
      if (c !== ",") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        rows.push(row);
        row = [];
      }
    } else if (c === '"' && field === "" && !closed) quoted = true;
    else {
      if (closed || c === '"')
        throw new Error("CSV invalide : guillemets mal fermés.");
      field += c;
    }
  }
  if (quoted) throw new Error("CSV incomplet : guillemets non fermés.");
  if (field !== "" || closed || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function previewSheets(
  sheetId: string,
  tabs: { name: string; csv: string }[],
): SheetPreview {
  const records: SheetRecord[] = [],
    issues: SheetIssue[] = [];
  const seen = new Set<string>();
  let fatal = false,
    total = 0;
  for (const name of questionTabs) {
    const tab = tabs.find((t) => t.name === name);
    if (!tab) {
      fatal = true;
      issues.push({ tab: name, message: "Onglet manquant." });
      continue;
    }
    let rows: string[][];
    try {
      rows = parseCsv(tab.csv);
    } catch {
      fatal = true;
      issues.push({ tab: name, message: "Lecture CSV impossible." });
      continue;
    }
    if (rows.length > 10001) {
      fatal = true;
      issues.push({
        tab: name,
        message: "Maximum de 10 000 lignes par onglet dépassé.",
      });
      continue;
    }
    total += rows.slice(1).filter((r) => r.some((c) => c.trim())).length;
    const names = (rows[0] ?? []).map(normalize);
    const missing = headers.filter((h) => !names.includes(normalize(h)));
    if (
      missing.length ||
      new Set(names.filter(Boolean)).size !== names.filter(Boolean).length
    ) {
      fatal = true;
      issues.push({
        tab: name,
        message: missing.length
          ? `Colonnes manquantes : ${missing.join(", ")}.`
          : "En-têtes en double.",
      });
      continue;
    }
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].some((c) => c.trim())) continue;
      const get = (h: string) =>
        (rows[i][names.indexOf(normalize(h))] ?? "").trim();
      const externalId = get("ID");
      const issue = (message: string) =>
        issues.push({ tab: name, row: i + 1, message });
      if (!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(externalId)) {
        issue(
          "ID requis : commence par une lettre, puis lettres, chiffres, tirets (80 caractères maximum).",
        );
        continue;
      }
      if (seen.has(externalId)) {
        fatal = true;
        issue(`ID en double : ${externalId}. Aucun import effectué.`);
        continue;
      }
      seen.add(externalId);
      const status = statuses.get(normalize(get("Statut")));
      if (!status) {
        issue("Statut attendu : Brouillon, Publié ou Archivé.");
        continue;
      }
      const difficulty = levels.get(normalize(get("Difficulté")));
      if (!difficulty || difficulty !== levels.get(normalize(name))) {
        issue("La difficulté doit correspondre à celle de l’onglet.");
        continue;
      }
      const parsed = questionInput.safeParse({
        id: `gs-${createHash("sha256").update(`${sheetId}:${externalId}`).digest("hex")}`,
        themeId: "one-piece",
        text: get("Question"),
        choices: [
          get("Bonne réponse"),
          get("Mauvaise réponse 1"),
          get("Mauvaise réponse 2"),
          get("Mauvaise réponse 3"),
        ],
        correct: get("Bonne réponse") ? 0 : null,
        explanation: get("Explication"),
        spoilerUntil: get("Spoiler jusqu’à"),
        difficulty,
        status,
        source: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      });
      if (!parsed.success) {
        issue(
          "Question incomplète, réponses identiques ou texte trop long : ligne ignorée, version précédente conservée.",
        );
        continue;
      }
      records.push({ ...parsed.data, externalId });
    }
  }
  return {
    records: fatal ? [] : records,
    report: {
      ok: !fatal,
      rows: total,
      imported: fatal ? 0 : records.length,
      issues,
    },
  };
}

export async function readQuestionSheets(
  sheetId: string,
  request: typeof fetch = fetch,
) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(sheetId))
    throw new Error("Identifiant Google Sheet invalide.");
  // All five reads must succeed before any database write. No change to Drive sharing.
  const tabs = await Promise.all(
    questionTabs.map(async (name) => {
      const url = new URL(
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`,
      );
      url.search = new URLSearchParams({
        tqx: "out:csv",
        headers: "1",
        sheet: name,
      }).toString();
      const response = await request(url, {
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
      });
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("text/csv") ||
        !response.body
      )
        throw new Error(
          `Onglet ${name} inaccessible : vérifier le lien et son accès en lecture.`,
        );
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 5_000_000)
            throw new Error(`Onglet ${name} trop volumineux (5 Mo maximum).`);
          chunks.push(value);
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      return { name, csv: Buffer.concat(chunks).toString("utf8") };
    }),
  );
  return previewSheets(sheetId, tabs);
}

export async function applySheetPreview(
  db: Sql,
  sheetId: string,
  preview: SheetPreview,
): Promise<SheetReport> {
  if (!preview.report.ok) {
    await recordSyncFailure(db, sheetId, preview.report);
    return preview.report;
  }
  // A single statement atomically updates the valid rows and the synchronization report.
  // Missing IDs/rows never mean deletion. Namespaced IDs cannot overwrite native questions.
  const { rows } = await db.query<{ report: SheetReport }>(
    `WITH changed AS (
    INSERT INTO akasha_questions(id,theme_id,text,choices,correct,explanation,difficulty,status,source,spoiler_until,sheet_id,sheet_question_id)
    SELECT q.id,'one-piece',q.text,ARRAY(SELECT jsonb_array_elements_text(q.choices)),q.correct,q.explanation,
      q.difficulty,q.status,q.source,q."spoilerUntil",$1,q."externalId"
    FROM jsonb_to_recordset($2::jsonb) AS q(id text,text text,choices jsonb,correct smallint,explanation text,
      difficulty text,status text,source text,"spoilerUntil" text,"externalId" text)
    ON CONFLICT(id) DO UPDATE SET text=excluded.text,choices=excluded.choices,correct=excluded.correct,
      explanation=excluded.explanation,difficulty=excluded.difficulty,status=excluded.status,
      spoiler_until=excluded.spoiler_until,source=excluded.source,updated_at=now()
    WHERE akasha_questions.sheet_id=$1 AND
      (akasha_questions.text,akasha_questions.choices,akasha_questions.correct,akasha_questions.explanation,
       akasha_questions.difficulty,akasha_questions.status,akasha_questions.spoiler_until,akasha_questions.source)
      IS DISTINCT FROM (excluded.text,excluded.choices,excluded.correct,excluded.explanation,
       excluded.difficulty,excluded.status,excluded.spoiler_until,excluded.source)
    RETURNING id
  ) INSERT INTO akasha_question_sync(sheet_id,succeeded_at,report)
    VALUES($1,now(),$3::jsonb || jsonb_build_object('changed',(SELECT count(*) FROM changed)))
    ON CONFLICT(sheet_id) DO UPDATE SET attempted_at=now(),succeeded_at=now(),report=excluded.report
    RETURNING report`,
    [sheetId, JSON.stringify(preview.records), JSON.stringify(preview.report)],
  );
  return rows[0].report;
}

async function recordSyncFailure(
  db: Sql,
  sheetId: string,
  report: SheetReport,
) {
  await db.query(
    `INSERT INTO akasha_question_sync(sheet_id,report) VALUES($1,$2::jsonb)
    ON CONFLICT(sheet_id) DO UPDATE SET attempted_at=now(),report=excluded.report`,
    [sheetId, JSON.stringify(report)],
  );
}

export async function synchronizeQuestions(
  db: Sql,
  sheetId: string,
  read = readQuestionSheets,
): Promise<SheetReport> {
  try {
    return await applySheetPreview(db, sheetId, await read(sheetId));
  } catch {
    // Never log response bodies, answer keys, credentials or SQL parameter dumps.
    const report: SheetReport = {
      ok: false,
      rows: 0,
      imported: 0,
      issues: [
        {
          tab: "Google Sheets",
          message:
            "Synchronisation indisponible. Les questions enregistrées sont conservées.",
        },
      ],
    };
    await recordSyncFailure(db, sheetId, report);
    return report;
  }
}

export function startQuestionSync(db: Sql, sheetId: string) {
  let stopped = false,
    timer: ReturnType<typeof setTimeout> | undefined;
  let previous = "";
  const run = async () => {
    try {
      const report = await synchronizeQuestions(db, sheetId);
      const message = JSON.stringify(report);
      if (message !== previous) {
        console.log("Questions Google Sheets:", message);
        previous = message;
      }
    } catch {
      console.error(
        "Questions Google Sheets : stockage du bilan indisponible.",
      );
    }
    if (!stopped)
      timer = setTimeout(() => {
        running = run();
      }, 60_000);
  };
  let running = run();
  return async () => {
    stopped = true;
    clearTimeout(timer);
    await running;
  };
}
