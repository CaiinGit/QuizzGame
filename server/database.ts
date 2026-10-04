import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { mkdir } from "node:fs/promises";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { view, type Room } from "./engine";
import { QuestionBank } from "./question-bank";
import { Accounts } from "./accounts";
import { rewards } from "./progression";
import type { XpReward } from "../shared/progression";
import type { RoomView } from "../shared/protocol";
import type {
  HistoryPage,
  MatchSummary,
  AccountStatistics,
  ModeStatistics,
} from "../shared/account";
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
    await this.db.query(`CREATE TABLE IF NOT EXISTS akasha_xp_awards (
      match_id TEXT NOT NULL, player_id TEXT NOT NULL REFERENCES akasha_accounts(id) ON DELETE CASCADE,
      reward JSONB NOT NULL, PRIMARY KEY(match_id,player_id))`);
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
      isAdmin: boolean;
      mustChangePassword: boolean;
    }>(
      `SELECT a.id,a.name,true AS account,a.is_admin AS "isAdmin",a.must_change_password AS "mustChangePassword" FROM akasha_account_sessions s JOIN akasha_accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>$2
       UNION ALL SELECT s.id,s.name,false AS account,false,false FROM akasha_sessions s WHERE s.token_hash=$1 AND s.expires_at>$2 AND NOT EXISTS(SELECT 1 FROM akasha_accounts a WHERE a.id=s.id)`,
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
         , archived AS (INSERT INTO akasha_match_history(id,players,result,finished_at) SELECT $4,$5::text[],$6::jsonb,$3 WHERE $6::jsonb IS NOT NULL ON CONFLICT(id) DO NOTHING),
         locked AS MATERIALIZED (
           SELECT a.id,a.total_xp,r.reward FROM akasha_accounts a
           JOIN jsonb_to_recordset($7::jsonb) AS r(id text,reward jsonb) ON r.id=a.id
           WHERE NOT EXISTS(SELECT 1 FROM akasha_xp_awards x WHERE x.match_id=$4 AND x.player_id=a.id)
           ORDER BY a.id FOR UPDATE OF a
         ), awarded AS (
           INSERT INTO akasha_xp_awards(match_id,player_id,reward)
           SELECT $4,id,reward || jsonb_build_object('before',total_xp,'after',total_xp+(reward->>'total')::integer)
           FROM locked ON CONFLICT DO NOTHING RETURNING player_id,reward
         ) UPDATE akasha_accounts a SET total_xp=a.total_xp+(w.reward->>'total')::integer
           FROM awarded w WHERE a.id=w.player_id`,
        [
          room.code,
          JSON.stringify(room),
          savedAt,
          `${room.code}:${room.createdAt}`,
          room.players.map((p) => p.id),
          result ? JSON.stringify(result) : null,
          JSON.stringify(rewards(room)),
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
  async reward(id: string, matchId: string) {
    return (
      (
        await this.db.query<{ reward: XpReward }>(
          "SELECT reward FROM akasha_xp_awards WHERE match_id=$1 AND player_id=$2",
          [matchId, id],
        )
      ).rows[0]?.reward ?? null
    );
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
      themeId: r.result.themeId ?? "one-piece",
      players: r.result.players,
      winnerId: r.result.winnerId,
      reason: r.result.reason,
      rounds: r.result.history.length,
    }));
    return { matches, next: rows.length > 20 ? offset + 20 : null };
  }
  async statistics(id: string): Promise<AccountStatistics> {
    const { rows } = await this.db.query<{
      mode: "duel" | "solo";
      played: string;
      completed: string;
      interrupted: string;
      wins: string;
      losses: string;
      draws: string;
      correct: string;
      questions: string;
    }>(
      `WITH games AS (
      SELECT result,COALESCE(result->>'mode','duel') AS mode,
        (SELECT count(*) FROM jsonb_array_elements(COALESCE(result->'history','[]'::jsonb)) r) AS questions,
        (SELECT count(*) FROM jsonb_array_elements(COALESCE(result->'history','[]'::jsonb)) r
          WHERE r->'answers'->$1->'choice'=r->'correct') AS correct
      FROM akasha_match_history WHERE players @> ARRAY[$1]::text[] AND result->>'phase'='finished'
    ) SELECT mode,count(*) AS played,
      count(*) FILTER(WHERE result->>'reason'='completed') AS completed,
      count(*) FILTER(WHERE result->>'reason'='forfeit') AS interrupted,
      count(*) FILTER(WHERE mode='duel' AND result->>'winnerId'=$1) AS wins,
      count(*) FILTER(WHERE mode='duel' AND result->>'winnerId' IS NOT NULL AND result->>'winnerId'<>$1) AS losses,
      count(*) FILTER(WHERE mode='duel' AND result->>'winnerId' IS NULL AND result->>'reason'='completed') AS draws,
      COALESCE(sum(correct),0) AS correct,COALESCE(sum(questions),0) AS questions
      FROM games GROUP BY mode`,
      [id],
    );
    const empty = (): ModeStatistics => ({
      played: 0,
      completed: 0,
      interrupted: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      correct: 0,
      questions: 0,
      accuracy: null,
    });
    const result: AccountStatistics = { duel: empty(), solo: empty() };
    for (const row of rows) {
      if (row.mode !== "duel" && row.mode !== "solo") continue;
      const value = result[row.mode];
      for (const key of [
        "played",
        "completed",
        "interrupted",
        "wins",
        "losses",
        "draws",
        "correct",
        "questions",
      ] as const)
        value[key] = Number(row[key]);
      value.accuracy = value.questions
        ? Math.round((100 * value.correct) / value.questions)
        : null;
    }
    return result;
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
