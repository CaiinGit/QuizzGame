import { randomBytes } from "node:crypto";
import { usernameInput } from "./accounts";
import type { Repository } from "./database";

// Trusted server maintenance only. Never expose this through an HTTP route.
export async function provisionAdmins(repository: Repository, names: string[]) {
  const usernames = names.map((n) => usernameInput.parse(n));
  if (usernames.length !== 3 || new Set(usernames).size !== 3)
    throw new Error("Il faut exactement trois pseudos distincts.");
  const credentials: {
    username: string;
    existing: boolean;
    password?: string;
    recoveryCode?: string;
  }[] = [];
  for (let i = 0; i < usernames.length; i++) {
    const username = usernames[i];
    const existing = await repository.db.query(
      "SELECT id FROM akasha_accounts WHERE username=$1",
      [username],
    );
    if (existing.rows.length) {
      credentials.push({ username, existing: true });
      continue;
    }
    const password = randomBytes(24).toString("base64url");
    const result = await repository.accounts.register({ username, password });
    await repository.accounts.logout(result.credentials.token);
    await repository.db.query(
      "UPDATE akasha_accounts SET name=$2,must_change_password=true WHERE id=$1",
      [result.profile.id, names[i]],
    );
    credentials.push({
      username,
      existing: false,
      password,
      recoveryCode: result.recoveryCode,
    });
  }
  await repository.db.query(
    "UPDATE akasha_accounts SET is_admin=(username=ANY($1::text[]))",
    [usernames],
  );
  return credentials;
}
