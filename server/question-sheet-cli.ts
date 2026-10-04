import { readQuestionSheets } from "./question-sheet";
import { themeIds, type ThemeId } from "../shared/themes";

// Read-only preview: no connection to either database and no answer keys in output.
const id = process.env.AKASHA_QUESTION_SHEET_ID ?? process.argv[2];
if (!id) throw new Error("Indique l’identifiant du Google Sheet à vérifier.");
const theme = process.argv[3] ?? "one-piece";
if (!themeIds.includes(theme as ThemeId)) throw new Error("Thème inconnu.");
const preview = await readQuestionSheets(id, fetch, theme as ThemeId);
console.log(JSON.stringify(preview.report, null, 2));
if (!preview.report.ok || preview.report.issues.length) process.exitCode = 1;
