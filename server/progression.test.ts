import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { io, type Socket } from "socket.io-client";
import { connectDatabase, Repository, type Sql } from "./database";
import { createApp } from "./app";
import { provisionAdmins } from "./admins";
import { newRoom, leave, type Room } from "./engine";
import { questions } from "./questions";
import { rewards } from "./progression";
import { progression } from "../shared/progression";
import type { AuthResult } from "../shared/account";

function finished(id = "one", other = "two"): Room {
  const room = newRoom(
    randomUUID().slice(0, 6),
    { id, name: id },
    questions,
    Date.now(),
  );
  room.players.push({ id: other, name: other, score: 6000, ready: true });
  room.phase = "finished";
  room.reason = "completed";
  room.winnerId = id;
  room.history = Array.from({ length: 10 }, (_, n) => ({
    round: n + 1,
    question: "Q",
    choices: ["A", "B", "C", "D"],
    correct: 0,
    answers: {
      [id]: { choice: n < 7 ? 0 : 1, points: n < 7 ? 700 : 0 },
      [other]: { choice: 0, points: 100 },
    },
  }));
  return room;
}
test("level thresholds, surplus and multiple levels", () => {
  assert.deepEqual(progression(0), {
    level: 1,
    current: 0,
    required: 200,
    total: 0,
  });
  assert.equal(progression(199).level, 1);
  assert.deepEqual(progression(200), {
    level: 2,
    current: 0,
    required: 250,
    total: 200,
  });
  assert.equal(progression(450).level, 3);
  assert.equal(progression(920).current, 170);
  for (let level = 1, total = 0; level <= 1000; level++) {
    assert.equal(progression(total).level, level);
    assert.equal(progression(total).current, 0);
    if (total) assert.equal(progression(total - 1).level, level - 1);
    total += 200 + 50 * (level - 1);
  }
});
test("XP distinguishes solo, winner, draw, inactivity, forfeit and legacy games", () => {
  const room = finished();
  assert.equal(rewards(room)[0].reward.total, 130);
  assert.equal(rewards(room)[1].reward.total, 130); // ten correct, lost; speed never affects XP
  room.mode = "solo";
  room.players.pop();
  assert.equal(rewards(room)[0].reward.total, 100);
  room.mode = "duel";
  room.winnerId = null;
  assert.equal(rewards(room)[0].reward.total, 115);
  room.history.forEach((r) => (r.answers.one.choice = null));
  assert.equal(rewards(room)[0].reward.total, 0);
  const partial = finished();
  partial.history = partial.history.slice(0, 4);
  partial.phase = "question";
  leave(partial, "two");
  assert.equal(rewards(partial)[0].reward.total, 52);
  assert.equal(rewards(partial)[1].reward.total, 0);
  leave(partial, "one"); // dismissing the verdict must not change the original quitter
  assert.equal(rewards(partial)[0].reward.total, 52);
  delete partial.xpVersion;
  assert.equal(rewards(partial).length, 0);
});
test(
  "private access, three admins, first-login password, API/socket authorization and durable XP",
  { timeout: 60000 },
  async () => {
    const schema = `private_${randomUUID().replaceAll("-", "")}`;
    const admin = process.env.TEST_DATABASE_URL
      ? new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL })
      : null;
    let db: Sql;
    if (admin) {
      await admin.query(`CREATE SCHEMA ${schema}`);
      const pool = new pg.Pool({
        connectionString: process.env.TEST_DATABASE_URL,
        options: `-c search_path=${schema}`,
      });
      db = {
        query: async <T>(sql: string, params?: unknown[]) => ({
          rows: (await pool.query(sql, params)).rows as T[],
        }),
        close: () => pool.end(),
      };
    } else db = await connectDatabase();
    const server = await createApp(db, { testMode: true }); // Private by default, even in tests.
    const sockets: Socket[] = [];
    try {
      await new Promise<void>((r) => server.http.listen(0, "127.0.0.1", r));
      const address = server.http.address();
      const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
      async function api(
        path: string,
        status: number,
        body?: unknown,
        token?: string,
      ) {
        const res = await fetch(`${base}/api/${path}`, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await res.json();
        assert.equal(res.status, status, JSON.stringify(data));
        return data;
      }
      async function socket(token: string, allowed: boolean) {
        const s = io(base, {
          auth: { token },
          autoConnect: false,
          reconnection: false,
        });
        sockets.push(s);
        await new Promise<void>((resolve, reject) => {
          s.once("connect", () =>
            allowed ? resolve() : reject(Error("Unauthorized socket admitted")),
          );
          s.once("connect_error", () =>
            allowed ? reject(Error("Admin socket rejected")) : resolve(),
          );
          s.connect();
        });
        return s;
      }
      const password = "Phrase de test confidentielle 2026!";
      const outsider = await server.repository.accounts.register({
        username: "outsider",
        password,
      });
      const guest = await server.repository.session("Visiteur");
      const existing = await server.repository.accounts.register({
        username: "caiin",
        password,
      });
      const admins = await provisionAdmins(server.repository, [
        "Caiin",
        "Bopin",
        "Superphantome",
      ]);
      assert.equal(admins[0].existing, true);
      assert.equal(
        (
          await db.query<{ n: number }>(
            "SELECT count(*)::int AS n FROM akasha_accounts WHERE is_admin",
          )
        ).rows[0].n,
        3,
      );
      await assert.rejects(
        provisionAdmins(server.repository, ["aab", "aab", "ccc"]),
      );
      assert.equal((await api("access", 200)).adminOnly, true);
      await api("session", 403, { name: "Intrus" });
      await api("account/register", 403, {
        username: "intrus",
        password,
        isAdmin: true,
      });
      await api("account/login", 403, { username: "outsider", password });
      await api("account/recover", 401, {
        username: "outsider",
        password,
        code: outsider.recoveryCode,
      });
      await api("account/me", 403, undefined, outsider.credentials.token);
      await api("account/history", 403, undefined, outsider.credentials.token);
      await api(
        "account/statistics",
        403,
        undefined,
        outsider.credentials.token,
      );
      await api(
        "account/favorites",
        403,
        { themeId: "one-piece", favorite: true },
        outsider.credentials.token,
      );
      await api(
        "account/profile",
        403,
        { isAdmin: true },
        outsider.credentials.token,
      );
      await socket(guest.token, false);
      await socket(outsider.credentials.token, false);
      const temporary: AuthResult = await api("account/login", 200, {
        username: "Bopin",
        password: admins[1].password,
      });
      assert.equal(temporary.profile.mustChangePassword, true);
      await socket(temporary.credentials.token, false);
      await api("account/history", 403, undefined, temporary.credentials.token);
      await api(
        "account/profile",
        403,
        { mustChangePassword: false },
        temporary.credentials.token,
      );
      const changed: AuthResult = await api(
        "account/security",
        200,
        { currentPassword: admins[1].password, password },
        temporary.credentials.token,
      );
      assert.equal(changed.profile.mustChangePassword, false);
      await api("account/me", 401, undefined, temporary.credentials.token);
      await socket(changed.credentials.token, true);
      const c: AuthResult = await api("account/login", 200, {
        username: "Caiin",
        password,
      });
      assert.equal(c.credentials.id, existing.credentials.id);
      await api(
        "account/profile",
        200,
        { totalXp: 90000, isAdmin: false },
        c.credentials.token,
      );
      assert.equal(
        (await server.repository.accounts.profile(c.credentials.id))!.totalXp,
        0,
      );
      assert.equal(
        (await server.repository.accounts.profile(c.credentials.id))!.isAdmin,
        true,
      );
      const room = finished(c.credentials.id, changed.credentials.id),
        match = `${room.code}:${room.createdAt}`;
      await Promise.all([
        server.repository.save(room),
        server.repository.save(room),
      ]);
      assert.equal(
        (await server.repository.accounts.profile(c.credentials.id))!.totalXp,
        130,
      );
      assert.equal(
        (await server.repository.reward(c.credentials.id, match))!.after,
        130,
      );
      const restarted = new Repository(db);
      await restarted.init();
      await restarted.save(room);
      assert.equal(
        (await restarted.accounts.profile(c.credentials.id))!.totalXp,
        130,
      );
      const second = finished(c.credentials.id, changed.credentials.id),
        third = finished(c.credentials.id, changed.credentials.id);
      await Promise.all([restarted.save(second), restarted.save(third)]);
      assert.equal(
        (await restarted.accounts.profile(c.credentials.id))!.totalXp,
        390,
      );
      const old = finished(c.credentials.id, changed.credentials.id);
      const stats = await api(
        "account/statistics",
        200,
        undefined,
        c.credentials.token,
      );
      assert.deepEqual(stats.duel, {
        played: 3,
        completed: 3,
        interrupted: 0,
        wins: 3,
        losses: 0,
        draws: 0,
        correct: 21,
        questions: 30,
        accuracy: 70,
      });
      assert.equal(stats.solo.accuracy, null);
      const solo = finished(c.credentials.id, changed.credentials.id);
      solo.mode = "solo";
      solo.players = solo.players.slice(0, 1);
      solo.reason = "forfeit";
      solo.forfeitedBy = c.credentials.id;
      solo.winnerId = null;
      solo.history = solo.history.slice(0, 3);
      solo.history[2].answers[c.credentials.id].choice = null;
      await restarted.save(solo);
      const withSolo = await api(
        "account/statistics",
        200,
        undefined,
        c.credentials.token,
      );
      assert.equal(withSolo.duel.played, 3);
      assert.deepEqual(withSolo.solo, {
        played: 1,
        completed: 0,
        interrupted: 1,
        wins: 0,
        losses: 0,
        draws: 0,
        correct: 2,
        questions: 3,
        accuracy: 67,
      });
      await api(
        "account/favorites",
        400,
        { themeId: "invented", favorite: true },
        c.credentials.token,
      );
      await api(
        "account/favorites",
        200,
        { themeId: "one-piece", favorite: true, id: changed.credentials.id },
        c.credentials.token,
      );
      const favorite = await api(
        "account/favorites",
        200,
        { themeId: "one-piece", favorite: true },
        c.credentials.token,
      );
      assert.deepEqual(favorite.favorites, ["one-piece"]);
      assert.deepEqual(
        (await restarted.accounts.profile(changed.credentials.id))!.favorites,
        [],
      );
      await restarted.init();
      assert.deepEqual(
        (await restarted.accounts.profile(c.credentials.id))!.favorites,
        ["one-piece"],
      );
      const removed = await api(
        "account/favorites",
        200,
        { themeId: "one-piece", favorite: false },
        c.credentials.token,
      );
      assert.deepEqual(removed.favorites, []);
      delete old.xpVersion;
      await restarted.save(old);
      assert.equal(
        (await restarted.accounts.profile(c.credentials.id))!.totalXp,
        390,
      );
      const thirdAdmin: AuthResult = await api("account/recover", 200, {
        username: "superphantome",
        code: admins[2].recoveryCode,
        password,
      });
      assert.equal(
        await api(
          `account/reward/${encodeURIComponent(match)}`,
          200,
          undefined,
          thirdAdmin.credentials.token,
        ),
        null,
      );
      const s = await socket(c.credentials.token, true);
      assert.equal(
        (
          await api(
            "account/statistics",
            200,
            undefined,
            thirdAdmin.credentials.token,
          )
        ).duel.played,
        0,
      );
      await db.query("UPDATE akasha_accounts SET is_admin=false WHERE id=$1", [
        c.credentials.id,
      ]);
      await api("account/me", 403, undefined, c.credentials.token);
      const disconnected = new Promise<void>((resolve) =>
        s.once("disconnect", () => resolve()),
      );
      s.emit("room:create", { mode: "solo" }, () => {});
      await disconnected;
      assert.equal(server.rooms.size, 0);
    } finally {
      sockets.forEach((s) => s.disconnect());
      await server.close();
      if (admin) {
        await admin.query(`DROP SCHEMA ${schema} CASCADE`);
        await admin.end();
      }
    }
  },
);
