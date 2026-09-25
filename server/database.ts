import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Room } from "./engine";
export interface Sql {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  close(): Promise<void>;
}
export async function connectDatabase(
  url?: string,
  directory?: string,
): Promise<Sql> {
  if (url) {
    const pool = new pg.Pool({ connectionString: url, max: 4 });
    return {
      query: async <T>(sql: string, params?: unknown[]) => ({
        rows: (await pool.query(sql, params)).rows as T[],
      }),
      close: () => pool.end(),
    };
  }
  const db = new PGlite(directory);
  await db.waitReady;
  return {
    query: <T>(sql: string, params?: unknown[]) => db.query<T>(sql, params),
    close: () => db.close(),
  };
}
export class Repository {
  constructor(public db: Sql) {}
  async init() {
    await this.db.query(
      "CREATE TABLE IF NOT EXISTS akasha_sessions (id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, name TEXT NOT NULL, expires_at BIGINT NOT NULL)",
    );
    await this.db.query(
      "CREATE TABLE IF NOT EXISTS akasha_rooms (code TEXT PRIMARY KEY, state JSONB NOT NULL, updated_at BIGINT NOT NULL)",
    );
    await this.db.query(
      "CREATE INDEX IF NOT EXISTS akasha_rooms_updated ON akasha_rooms(updated_at)",
    );
    await this.db.query("DELETE FROM akasha_sessions WHERE expires_at < $1", [
      Date.now(),
    ]);
    await this.db.query("DELETE FROM akasha_rooms WHERE updated_at < $1", [
      Date.now() - 7 * 86400000,
    ]);
  }
  async session(name: string) {
    const id = randomUUID(),
      token = randomBytes(32).toString("hex");
    await this.db.query(
      "INSERT INTO akasha_sessions(id,token_hash,name,expires_at) VALUES($1,$2,$3,$4)",
      [
        id,
        createHash("sha256").update(token).digest("hex"),
        name,
        Date.now() + 30 * 86400000,
      ],
    );
    return { id, token, name };
  }
  async authenticate(token: string) {
    const result = await this.db.query<{ id: string; name: string }>(
      "SELECT id,name FROM akasha_sessions WHERE token_hash=$1 AND expires_at>$2",
      [createHash("sha256").update(token).digest("hex"), Date.now()],
    );
    return result.rows[0] ?? null;
  }
  async save(room: Room) {
    try {
      await this.db.query(
        "INSERT INTO akasha_rooms(code,state,updated_at) VALUES($1,$2::jsonb,$3) ON CONFLICT(code) DO UPDATE SET state=excluded.state,updated_at=excluded.updated_at",
        [room.code, JSON.stringify(room), Date.now()],
      );
    } catch (error) {
      console.error("Room persistence failed", error);
      throw new Error(
        "Sauvegarde indisponible. Réessaie dans quelques instants.",
      );
    }
  }
  async rooms() {
    return (
      await this.db.query<{ state: Room }>(
        "SELECT state FROM akasha_rooms ORDER BY updated_at",
        [],
      )
    ).rows.map((r) => r.state);
  }
}
