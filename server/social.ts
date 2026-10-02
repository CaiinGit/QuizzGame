import { randomUUID } from "node:crypto";
import type { Sql } from "./database";
import { UserError, usernameInput } from "./accounts";
import type { Friend, SocialState } from "../shared/account";

export type InviteRow = {
  id: string;
  sender: string;
  recipient: string;
  kind: "duel" | "rematch";
  room_code: string;
  origin_key: string | null;
  expires_at: string;
  status: string;
};
export class Social {
  constructor(private db: Sql) {}
  async init() {
    await this.db.query(`CREATE TABLE IF NOT EXISTS akasha_friendships (
      id TEXT PRIMARY KEY, sender TEXT NOT NULL REFERENCES akasha_accounts(id) ON DELETE CASCADE,
      recipient TEXT NOT NULL REFERENCES akasha_accounts(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted')),
      CHECK(sender<>recipient), created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await this.db.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS akasha_friend_pair ON akasha_friendships(LEAST(sender,recipient),GREATEST(sender,recipient))",
    );
    await this.db.query(`CREATE TABLE IF NOT EXISTS akasha_invitations (
      id TEXT PRIMARY KEY, sender TEXT NOT NULL, recipient TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('duel','rematch')),
      room_code TEXT NOT NULL, origin_key TEXT, expires_at BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', CHECK(sender<>recipient))`);
    await this.db.query(
      "CREATE INDEX IF NOT EXISTS akasha_invitations_recipient ON akasha_invitations(recipient,status,expires_at)",
    );
    await this.db.query(
      "DELETE FROM akasha_invitations WHERE expires_at < $1",
      [Date.now() - 86400000],
    );
  }
  async request(id: string, username: unknown) {
    const key = usernameInput.parse(username);
    const target = (
      await this.db.query<{ id: string }>(
        "SELECT id FROM akasha_accounts WHERE username=$1",
        [key],
      )
    ).rows[0];
    if (!target) throw new UserError("Aucun joueur ne correspond à ce pseudo.");
    if (target.id === id) throw new UserError("C’est ton propre compte.");
    for (const owner of [id, target.id]) {
      const { rows } = await this.db.query<{ count: string }>(
        "SELECT count(*) FROM akasha_friendships WHERE sender=$1 OR recipient=$1",
        [owner],
      );
      if (Number(rows[0].count) >= 100)
        throw new UserError("La liste d’amis ou de demandes est pleine.");
    }
    await this.db.query(
      "INSERT INTO akasha_friendships(id,sender,recipient) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [randomUUID(), id, target.id],
    );
  }
  async respond(id: string, request: string, accept: boolean) {
    const result = accept
      ? await this.db.query(
          "UPDATE akasha_friendships SET status='accepted' WHERE id=$1 AND recipient=$2 AND status='pending' RETURNING id",
          [request, id],
        )
      : await this.db.query(
          "DELETE FROM akasha_friendships WHERE id=$1 AND (sender=$2 OR recipient=$2) RETURNING id",
          [request, id],
        );
    if (!result.rows.length)
      throw new UserError("Cette demande n’est plus disponible.");
  }
  async remove(id: string, friend: string) {
    await this.db.query(
      "DELETE FROM akasha_friendships WHERE (sender=$1 AND recipient=$2) OR (sender=$2 AND recipient=$1)",
      [id, friend],
    );
    await this.db.query(
      "UPDATE akasha_invitations SET status='cancelled' WHERE status='pending' AND kind='duel' AND ((sender=$1 AND recipient=$2) OR (sender=$2 AND recipient=$1))",
      [id, friend],
    );
  }
  async areFriends(a: string, b: string) {
    return !!(
      await this.db.query(
        "SELECT id FROM akasha_friendships WHERE status='accepted' AND ((sender=$1 AND recipient=$2) OR (sender=$2 AND recipient=$1))",
        [a, b],
      )
    ).rows.length;
  }
  async invite(
    sender: string,
    recipient: string,
    kind: "duel" | "rematch",
    roomCode: string,
    origin: string | null = null,
  ) {
    const pending = await this.db.query<InviteRow>(
      `SELECT * FROM akasha_invitations WHERE status='pending' AND expires_at>$1 AND
      ((sender=$2 AND recipient=$3) OR (sender=$3 AND recipient=$2)) AND kind=$4 AND (origin_key IS NOT DISTINCT FROM $5)`,
      [Date.now(), sender, recipient, kind, origin],
    );
    if (pending.rows[0]) return pending.rows[0];
    return (
      await this.db.query<InviteRow>(
        `INSERT INTO akasha_invitations(id,sender,recipient,kind,room_code,origin_key,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          randomUUID(),
          sender,
          recipient,
          kind,
          roomCode,
          origin,
          Date.now() + 5 * 60000,
        ],
      )
    ).rows[0];
  }
  async getInvite(id: string) {
    return (
      await this.db.query<InviteRow>(
        "SELECT * FROM akasha_invitations WHERE id=$1",
        [id],
      )
    ).rows[0];
  }
  async resolve(id: string, status: string, roomCode?: string) {
    await this.db.query(
      "UPDATE akasha_invitations SET status=$2,room_code=COALESCE($3,room_code) WHERE id=$1",
      [id, status, roomCode ?? null],
    );
  }
  async state(id: string, online: Set<string>): Promise<SocialState> {
    const friend = (r: {
      player_id: string;
      username: string;
      name: string;
    }): Friend => ({
      id: r.player_id,
      username: r.username,
      name: r.name,
      online: online.has(r.player_id),
    });
    const { rows } = await this.db.query<{
      id: string;
      sender: string;
      status: string;
      player_id: string;
      username: string;
      name: string;
    }>(
      `SELECT f.id,f.sender,f.status,a.id AS player_id,a.username,a.name FROM akasha_friendships f
       JOIN akasha_accounts a ON a.id=CASE WHEN f.sender=$1 THEN f.recipient ELSE f.sender END WHERE f.sender=$1 OR f.recipient=$1 ORDER BY a.username`,
      [id],
    );
    const invites = await this.db.query<
      InviteRow & { player_id: string; username: string; name: string }
    >(
      `SELECT i.*,a.id AS player_id,a.username,a.name FROM akasha_invitations i JOIN akasha_accounts a
       ON a.id=CASE WHEN i.sender=$1 THEN i.recipient ELSE i.sender END WHERE (i.sender=$1 OR i.recipient=$1) AND i.status='pending' AND i.expires_at>$2 ORDER BY i.expires_at`,
      [id, Date.now()],
    );
    const mapInvite = (r: (typeof invites.rows)[number]) => ({
      id: r.id,
      kind: r.kind,
      player: friend(r),
      expiresAt: Number(r.expires_at),
    });
    return {
      friends: rows.filter((r) => r.status === "accepted").map(friend),
      incoming: rows
        .filter((r) => r.status === "pending" && r.sender !== id)
        .map((r) => ({ id: r.id, player: friend(r) })),
      outgoing: rows
        .filter((r) => r.status === "pending" && r.sender === id)
        .map((r) => ({ id: r.id, player: friend(r) })),
      invitations: invites.rows
        .filter((r) => r.recipient === id)
        .map(mapInvite),
      sentInvitations: invites.rows
        .filter((r) => r.sender === id)
        .map(mapInvite),
    };
  }
}
