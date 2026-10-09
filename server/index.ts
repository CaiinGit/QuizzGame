import { connectDatabase } from "./database";
import { createApp } from "./app";
import { durations } from "./engine";
import {
  startQuestionSync,
  questionSources,
  questionSheetLayout,
} from "./question-sheet";
const sources = questionSources(process.env);
const sheetLayout = questionSheetLayout(
  process.env.AKASHA_QUESTION_SHEET_LAYOUT,
);
const production = process.env.NODE_ENV === "production";
if (production && !process.env.DATABASE_URL)
  throw new Error("DATABASE_URL est obligatoire en production.");
if (production && !process.env.ALLOWED_ORIGINS)
  throw new Error("ALLOWED_ORIGINS est obligatoire en production.");
const testMode = process.env.AKASHA_TEST_MODE === "1" && !production;
const database = await connectDatabase(
  process.env.DATABASE_URL,
  process.env.AKASHA_DATA_DIR ?? "work/akasha-db",
);
const server = await createApp(database, {
  privateAccess: process.env.AKASHA_ACCESS !== "public",
  origins: process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()),
  staticDir: "dist",
  testMode,
  times: testMode ? { ...durations, question: 4000, reveal: 900 } : durations,
});
const port = Number(process.env.PORT ?? 3001);
const syncStops = sources.map(({ sheetId, themeId }) =>
  startQuestionSync(database, sheetId, themeId, sheetLayout),
);
const stopQuestionSync = async () => {
  await Promise.all(syncStops.map((stop) => stop()));
};
server.http.listen(port, process.env.HOST ?? "127.0.0.1", () =>
  console.log(`Akasha écoute sur le port ${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(
    signal,
    () =>
      void stopQuestionSync()
        .then(() => server.close())
        .then(() => process.exit(0)),
  );
