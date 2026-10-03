import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import sharp from "sharp";
import { themes } from "../shared/themes";
import type { Sql } from "./database";
import {
  MIN_PASSWORD_LENGTH,
  type AccountProfile,
  type AuthResult,
} from "../shared/account";

export class UserError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const usernameInput = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_]{3,20}$/,
    "Utilise 3 à 20 lettres sans accents, chiffres ou underscores pour ton pseudo unique.",
  );
export const nameInput = z
  .string()
  .trim()
  .min(2)
  .max(20)
  .regex(/^[\p{L}\p{N} _.-]+$/u);
export const passwordInput = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Choisis un mot de passe d’au moins ${MIN_PASSWORD_LENGTH} caractères.`,
  )
  .max(128);
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const fields =
  'id,username,name,photo,is_admin AS "isAdmin",must_change_password AS "mustChangePassword",total_xp AS "totalXp",favorites';
let hashing = 0;
async function derive(password: string, salt: string) {
  if (hashing >= 2)
    throw new UserError(
      "Connexion occupée. Réessaie dans quelques secondes.",
      429,
    );
  hashing++;
  try {
    return await new Promise<Buffer>((resolve, reject) =>
      scrypt(
        password,
        salt,
        64,
        { N: 65536, r: 8, p: 2, maxmem: 96 * 1024 * 1024 },
        (error, key) => (error ? reject(error) : resolve(key)),
      ),
    );
  } finally {
    hashing--;
  }
}
async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-65536-8-2:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
async function verify(password: string, stored?: string) {
  const [, salt, digest] = (
    stored ?? `scrypt-65536-8-2:${"0".repeat(32)}:${"0".repeat(128)}`
  ).split(":");
  const key = await derive(password, salt);
  return timingSafeEqual(key, Buffer.from(digest, "hex")) && !!stored;
}
const newRecovery = () =>
  randomBytes(24)
    .toString("hex")
    .toUpperCase()
    .match(/.{1,8}/g)!
    .join("-");
const recoveryHash = (code: string) =>
  hashToken(code.replace(/[\s-]/g, "").toUpperCase());
type PrivateAccount = AccountProfile & {
  is_admin: boolean;
  password_hash: string;
  recovery_hash: string;
};

export class Accounts {
  constructor(private db: Sql) {}
  async init() {
    await this.db.query(`CREATE TABLE IF NOT EXISTS akasha_accounts (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,20}$'),
      name TEXT NOT NULL, photo TEXT, password_hash TEXT NOT NULL, recovery_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await this.db.query(`ALTER TABLE akasha_accounts
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 0 CHECK(total_xp >= 0)`);
    await this.db.query(
      `ALTER TABLE akasha_accounts ADD COLUMN IF NOT EXISTS favorites TEXT[] NOT NULL DEFAULT '{}' CHECK(cardinality(favorites)<=3)`,
    );
    await this.db.query(`CREATE TABLE IF NOT EXISTS akasha_account_sessions (
      token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES akasha_accounts(id) ON DELETE CASCADE,
      expires_at BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await this.db.query(
      "CREATE INDEX IF NOT EXISTS akasha_account_sessions_owner ON akasha_account_sessions(account_id)",
    );
    await this.db.query(
      "DELETE FROM akasha_account_sessions WHERE expires_at < $1",
      [Date.now()],
    );
  }
  async profile(id: string) {
    return (
      (
        await this.db.query<AccountProfile>(
          `SELECT ${fields} FROM akasha_accounts WHERE id=$1`,
          [id],
        )
      ).rows[0] ?? null
    );
  }
  async register(
    input: unknown,
    guest?: { id: string; name: string } | null,
  ): Promise<AuthResult> {
    const data = z
      .object({ username: usernameInput, password: passwordInput })
      .parse(input);
    const encoded = await passwordHash(data.password);
    const id = guest?.id ?? randomUUID(),
      token = randomBytes(32).toString("hex"),
      recoveryCode = newRecovery();
    try {
      const { rows } = await this.db.query<AccountProfile>(
        `WITH created AS (
        INSERT INTO akasha_accounts(id,username,name,password_hash,recovery_hash) VALUES($1,$2,$3,$4,$5) RETURNING ${fields}
      ), session AS (
        INSERT INTO akasha_account_sessions(token_hash,account_id,expires_at) SELECT $6,id,$7 FROM created
      ), old_guest AS (DELETE FROM akasha_sessions WHERE id IN (SELECT id FROM created)) SELECT * FROM created`,
        [
          id,
          data.username,
          guest?.name ?? data.username,
          encoded,
          recoveryHash(recoveryCode),
          hashToken(token),
          Date.now() + 30 * 86400000,
        ],
      );
      return {
        credentials: { id, token, name: rows[0].name, account: true },
        profile: rows[0],
        recoveryCode,
      };
    } catch (e) {
      if ((e as { code?: string }).code === "23505")
        throw new UserError(
          "Ce pseudo est déjà utilisé ou ce profil possède déjà un compte.",
          409,
        );
      throw e;
    }
  }
  async login(input: unknown, adminOnly = false): Promise<AuthResult> {
    const data = z
      .object({ username: usernameInput, password: z.string().min(1).max(128) })
      .parse(input);
    const account = (
      await this.db.query<PrivateAccount>(
        "SELECT * FROM akasha_accounts WHERE username=$1",
        [data.username],
      )
    ).rows[0];
    if (!(await verify(data.password, account?.password_hash)))
      throw new UserError("Pseudo ou mot de passe incorrect.", 401);
    if (adminOnly && !account.is_admin)
      throw new UserError(
        "Akasha est en test privé. Un compte administrateur est nécessaire.",
        403,
      );
    const token = randomBytes(32).toString("hex");
    // Compare again in SQL: a concurrent recovery must invalidate an old password login.
    const result = await this.db.query(
      `INSERT INTO akasha_account_sessions(token_hash,account_id,expires_at)
      SELECT $1,id,$2 FROM akasha_accounts WHERE id=$3 AND password_hash=$4 AND (NOT $5::boolean OR is_admin) RETURNING account_id`,
      [
        hashToken(token),
        Date.now() + 30 * 86400000,
        account.id,
        account.password_hash,
        adminOnly,
      ],
    );
    if (!result.rows.length)
      throw new UserError("Reconnecte-toi avec ton nouveau mot de passe.", 401);
    return {
      credentials: { id: account.id, name: account.name, token, account: true },
      profile: (await this.profile(account.id))!,
    };
  }
  async recover(input: unknown, adminOnly = false): Promise<AuthResult> {
    const data = z
      .object({
        username: usernameInput,
        code: z.string().min(1).max(100),
        password: passwordInput,
      })
      .parse(input);
    const encoded = await passwordHash(data.password),
      token = randomBytes(32).toString("hex"),
      recoveryCode = newRecovery();
    const { rows } = await this.db.query<AccountProfile>(
      `WITH changed AS (
      UPDATE akasha_accounts SET password_hash=$1,recovery_hash=$2,must_change_password=false,updated_at=now()
      WHERE username=$3 AND recovery_hash=$4 AND (NOT $7::boolean OR is_admin) RETURNING ${fields}
    ), revoked AS (DELETE FROM akasha_account_sessions WHERE account_id IN (SELECT id FROM changed)),
    session AS (INSERT INTO akasha_account_sessions(token_hash,account_id,expires_at) SELECT $5,id,$6 FROM changed)
    SELECT * FROM changed`,
      [
        encoded,
        recoveryHash(recoveryCode),
        data.username,
        recoveryHash(data.code),
        hashToken(token),
        Date.now() + 30 * 86400000,
        adminOnly,
      ],
    );
    if (!rows.length)
      throw new UserError("Pseudo ou code de secours incorrect.", 401);
    return {
      credentials: { id: rows[0].id, name: rows[0].name, token, account: true },
      profile: rows[0],
      recoveryCode,
    };
  }
  async security(id: string, input: unknown): Promise<AuthResult> {
    const data = z
      .object({
        currentPassword: z.string().min(1).max(128),
        password: passwordInput,
      })
      .parse(input);
    const account = (
      await this.db.query<PrivateAccount>(
        "SELECT * FROM akasha_accounts WHERE id=$1",
        [id],
      )
    ).rows[0];
    if (!(await verify(data.currentPassword, account?.password_hash)))
      throw new UserError("Mot de passe actuel incorrect.", 401);
    if (data.currentPassword === data.password)
      throw new UserError(
        "Choisis un nouveau mot de passe différent de l’actuel.",
      );
    const encoded = await passwordHash(data.password),
      token = randomBytes(32).toString("hex"),
      recoveryCode = newRecovery();
    const { rows } = await this.db.query<AccountProfile>(
      `WITH changed AS (
      UPDATE akasha_accounts SET password_hash=$1,recovery_hash=$2,must_change_password=false,updated_at=now() WHERE id=$3 AND password_hash=$4 RETURNING ${fields}
    ), revoked AS (DELETE FROM akasha_account_sessions WHERE account_id IN (SELECT id FROM changed)),
    session AS (INSERT INTO akasha_account_sessions(token_hash,account_id,expires_at) SELECT $5,id,$6 FROM changed)
    SELECT * FROM changed`,
      [
        encoded,
        recoveryHash(recoveryCode),
        id,
        account.password_hash,
        hashToken(token),
        Date.now() + 30 * 86400000,
      ],
    );
    if (!rows.length)
      throw new UserError("Le compte a changé. Reconnecte-toi.", 401);
    return {
      credentials: { id, name: rows[0].name, token, account: true },
      profile: rows[0],
      recoveryCode,
    };
  }
  async updateProfile(id: string, input: unknown) {
    const data = z
      .object({
        name: nameInput.optional(),
        photo: z.string().max(300000).nullable().optional(),
      })
      .parse(input);
    let photo: string | null | undefined = data.photo;
    if (photo) {
      if (!/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(photo))
        throw new UserError("Choisis une image JPG, PNG ou WebP.");
      try {
        const bytes = Buffer.from(photo.split(",")[1], "base64");
        const clean = await sharp(bytes, {
          limitInputPixels: 1024 * 1024,
          animated: false,
        })
          .rotate()
          .resize(320, 320, { fit: "cover" })
          .webp({ quality: 85 })
          .toBuffer();
        photo = `data:image/webp;base64,${clean.toString("base64")}`;
      } catch {
        throw new UserError("Impossible de lire cette photo.");
      }
    }
    const { rows } = await this.db.query<AccountProfile>(
      `UPDATE akasha_accounts SET name=COALESCE($2,name),
      photo=CASE WHEN $3 THEN $4 ELSE photo END,updated_at=now() WHERE id=$1 RETURNING ${fields}`,
      [id, data.name ?? null, photo !== undefined, photo ?? null],
    );
    return rows[0];
  }
  async logout(token: string) {
    await this.db.query(
      "DELETE FROM akasha_account_sessions WHERE token_hash=$1",
      [hashToken(token)],
    );
  }
  async favorite(id: string, input: unknown) {
    const { themeId, favorite } = z
      .object({ themeId: z.string(), favorite: z.boolean() })
      .parse(input);
    if (!themes.some((t) => t.id === themeId))
      throw new UserError("Ce thème n’est pas disponible.");
    const { rows } = await this.db.query<AccountProfile>(
      `UPDATE akasha_accounts SET favorites=CASE WHEN $3::boolean THEN
        CASE WHEN $2=ANY(favorites) THEN favorites ELSE array_append(favorites,$2) END
        ELSE array_remove(favorites,$2) END,updated_at=now()
       WHERE id=$1 AND (NOT $3::boolean OR $2=ANY(favorites) OR cardinality(favorites)<3) RETURNING ${fields}`,
      [id, themeId, favorite],
    );
    if (!rows.length)
      throw new UserError(
        "Tu peux choisir trois favoris. Retire un thème pour en ajouter un autre.",
        409,
      );
    return rows[0];
  }
}
