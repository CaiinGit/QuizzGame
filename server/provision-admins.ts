import { writeFile } from "node:fs/promises";
import { connectDatabase, Repository } from "./database";
import { provisionAdmins } from "./admins";

// Usage: AKASHA_ADMIN_OUTPUT=/protected/new-file.json tsx server/provision-admins.ts name1 name2 name3
// Credential file must be new, outside the repository, and transmitted privately.
const output = process.env.AKASHA_ADMIN_OUTPUT;
if (!output)
  throw new Error("Définis AKASHA_ADMIN_OUTPUT vers un nouveau fichier privé.");
const db = await connectDatabase(
  process.env.DATABASE_URL,
  process.env.AKASHA_DATA_DIR ?? "work/akasha-db",
);
try {
  // Reserve the destination before any mutation; refuse to overwrite existing credentials.
  await writeFile(output, "", { flag: "wx", mode: 0o600 });
  const repository = new Repository(db);
  await repository.init();
  const accounts = await provisionAdmins(repository, process.argv.slice(2));
  await writeFile(
    output,
    JSON.stringify({ url: "https://akashaquiz.com", accounts }, null, 2),
    { mode: 0o600 },
  );
  console.log(
    "Trois administrateurs configurés. Identifiants enregistrés dans le fichier privé.",
  );
} finally {
  await db.close();
}
