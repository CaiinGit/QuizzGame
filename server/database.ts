import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { mkdir } from "node:fs/promises";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { view, type Room } from "./engine";
import { QuestionBank } from "./question-bank";
import { Accounts } from "./accounts";
import type { RoomView } from "../shared/protocol";
import type { HistoryPage, MatchSummary } from "../shared/account";
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
  if (directory) await mkdir(directory, { recursive: true });
  const db = new PGlite(directory);
  await db.waitReady;
  return {
    query: <T>(sql: string, params?: unknown[]) => db.query<T>(sql, params),
    close: () => db.close(),
  };
}
export class Repository {
  readonly questionBank: QuestionBank;
  readonly accounts: Accounts;
  constructor(public db: Sql) {
    this.questionBank = new QuestionBank(db);
    this.accounts = new Accounts(db);
  }
  async init() {
    await this.questionBank.init();
    await this.db.query(
      "CREATE TABLE IF NOT EXISTS akasha_sessions (id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, name TEXT NOT NULL, expires_at BIGINT NOT NULL)",
    );
    await this.db.query(
      "CREATE TABLE IF NOT EXISTS akasha_rooms (code TEXT PRIMARY KEY, state JSONB NOT NULL, updated_at BIGINT NOT NULL)",
    );
    await this.accounts.init();
    await this.db.query(`CREATE TABLE IF NOT EXISTS akasha_match_history (
      id TEXT PRIMARY KEY, players TEXT[] NOT NULL, result JSONB NOT NULL, finished_at BIGINT NOT NULL)`);
    await this.db.query(
      "CREATE INDEX IF NOT EXISTS akasha_history_players ON akasha_match_history USING GIN(players)",
    );
    await this.db.query(
      "CREATE INDEX IF NOT EXISTS akasha_history_date ON akasha_match_history(finished_at DESC,id)",
    );
    // Preserve available results from before account support, before pruning room snapshots.
    const old = await this.db.query<{ state: Room; updated_at: string }>(
      "SELECT state,updated_at FROM akasha_rooms WHERE state->>'phase'='finished' AND NOT EXISTS (SELECT 1 FROM akasha_match_history h WHERE h.id=akasha_rooms.code || ':' || (state->>'createdAt'))",
    );
    for (const { state, updated_at } of old.rows)
      await this.save(
        {
          ...state,
          mode: state.mode ?? "duel",
          history: state.history ?? [],
        },
        Number(updated_at),
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
    const result = await this.db.query<{
      id: string;
      name: string;
      account: boolean;
    }>(
      `SELECT a.id,a.name,true AS account FROM akasha_account_sessions s JOIN akasha_accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>$2
       UNION ALL SELECT s.id,s.name,false AS account FROM akasha_sessions s WHERE s.token_hash=$1 AND s.expires_at>$2 AND NOT EXISTS(SELECT 1 FROM akasha_accounts a WHERE a.id=s.id)`,
      [createHash("sha256").update(token).digest("hex"), Date.now()],
    );
    return result.rows[0] ?? null;
  }
  async save(room: Room, savedAt = Date.now()) {
    try {
      const result =
        room.phase === "finished"
          ? view(room, room.players[0].id, new Set(), Date.now())
          : null;
      await this.db.query(
        `WITH saved AS (INSERT INTO akasha_rooms(code,state,updated_at) VALUES($1,$2::jsonb,$3) ON CONFLICT(code) DO UPDATE SET state=excluded.state,updated_at=excluded.updated_at)
         INSERT INTO akasha_match_history(id,players,result,finished_at) SELECT $4,$5::text[],$6::jsonb,$3 WHERE $6::jsonb IS NOT NULL ON CONFLICT(id) DO NOTHING`,
        [
          room.code,
          JSON.stringify(room),
          savedAt,
          `${room.code}:${room.createdAt}`,
          room.players.map((p) => p.id),
          result ? JSON.stringify(result) : null,
        ],
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
  async history(id: string, offset: number): Promise<HistoryPage> {
    const { rows } = await this.db.query<{
      id: string;
      result: RoomView;
      finished_at: string;
    }>(
      "SELECT id,result,finished_at FROM akasha_match_history WHERE players @> ARRAY[$1]::text[] ORDER BY finished_at DESC,id DESC LIMIT 21 OFFSET $2",
      [id, offset],
    );
    const matches: MatchSummary[] = rows.slice(0, 20).map((r) => ({
      id: r.id,
      finishedAt: Number(r.finished_at),
      mode: r.result.mode,
      players: r.result.players,
      winnerId: r.result.winnerId,
      reason: r.result.reason,
      rounds: r.result.history.length,
    }));
    return { matches, next: rows.length > 20 ? offset + 20 : null };
  }
  async historyDetail(id: string, match: string) {
    return (
      (
        await this.db.query<{ result: RoomView }>(
          "SELECT result FROM akasha_match_history WHERE id=$1 AND players @> ARRAY[$2]::text[]",
          [match, id],
        )
      ).rows[0]?.result ?? null
    );
  }
}
