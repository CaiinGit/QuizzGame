import { readQuestionSheets } from "./question-sheet";

// Read-only preview: no connection to either database and no answer keys in output.
const id = process.env.AKASHA_QUESTION_SHEET_ID ?? process.argv[2];
if (!id) throw new Error("Indique l’identifiant du Google Sheet à vérifier.");
const preview = await readQuestionSheets(id);
console.log(JSON.stringify(preview.report, null, 2));
if (!preview.report.ok || preview.report.issues.length) process.exitCode = 1;
