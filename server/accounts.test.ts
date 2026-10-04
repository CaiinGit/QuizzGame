import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join as pathJoin } from "node:path";
import pg from "pg";
import sharp from "sharp";
import { io, type Socket } from "socket.io-client";
import { createApp } from "./app";
import { connectDatabase, type Sql } from "./database";
import { durations, newRoom } from "./engine";
import { questions } from "./questions";
import type { AuthResult, SocialState, HistoryPage } from "../shared/account";
import type { Credentials, RoomView, Ack } from "../shared/protocol";

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function wait(fn: () => boolean) {
  for (let i = 0; i < 250; i++) {
    if (fn()) return;
    await pause(20);
  }
  throw Error("Timed out");
}
function command(socket: Socket, event: string, data: unknown = {}) {
  return new Promise<void>((resolve, reject) =>
    socket
      .timeout(3000)
      .emit(event, data, (e: Error | null, r: Ack<unknown>) =>
        e ? reject(e) : r.ok ? resolve() : reject(Error(r.error)),
      ),
  );
}

test("accounts, private history, friends, invitations, rematch, recovery and persistent restart", async () => {
  const dir = await mkdtemp(pathJoin(tmpdir(), "akasha-accounts-"));
  const schema = `accounts_test_${randomUUID().replaceAll("-", "")}`;
  const admin = process.env.TEST_DATABASE_URL
    ? new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL })
    : null;
  if (admin) await admin.query(`CREATE SCHEMA ${schema}`);
  async function db(): Promise<Sql> {
    if (!admin) return connectDatabase(undefined, pathJoin(dir, "db"));
    const pool = new pg.Pool({
      connectionString: process.env.TEST_DATABASE_URL,
      options: `-c search_path=${schema}`,
    });
    return {
      query: async <T>(sql: string, params?: unknown[]) => ({
        rows: (await pool.query(sql, params)).rows as T[],
      }),
      close: () => pool.end(),
    };
  }
  let server: Awaited<ReturnType<typeof createApp>> | undefined,
    base = "";
  const clients: Socket[] = [];
  async function start() {
    server = await createApp(await db(), {
      testMode: true,
      privateAccess: false,
      times: {
        ...durations,
        reading: 100,
        countdown: 60,
        question: 15000,
        reveal: 100,
      },
    });
    await new Promise<void>((r) => server!.http.listen(0, "127.0.0.1", r));
    const addr = server.http.address();
    base = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
  }
  async function request(
    path: string,
    body?: unknown,
    credentials?: Credentials,
    status = 200,
  ) {
    const res = await fetch(base + "/api/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(credentials
          ? { Authorization: `Bearer ${credentials.token}` }
          : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const value = await res.json();
    assert.equal(res.status, status, JSON.stringify(value));
    return value;
  }
  async function client(c: Credentials) {
    const s = io(base, {
      auth: { token: c.token },
      autoConnect: false,
      reconnection: false,
    });
    clients.push(s);
    const state: { room: RoomView | null; social: SocialState | null } = {
      room: null,
      social: null,
    };
    s.on("room:state", (r) => (state.room = r));
    s.on("social:state", (r) => (state.social = r));
    await new Promise<void>((resolve, reject) => {
      s.once("connect", resolve);
      s.once("connect_error", reject);
      s.connect();
    });
    await wait(() => !!state.social);
    return { s, state };
  }
  const pass = "Akasha!8",
    nextPass = "Retour!8";
  try {
    await start();
    await request(
      "account/register",
      { username: "short", password: "Court!7" },
      undefined,
      400,
    );
    const guest: Credentials = await request(
      "session",
      { name: "Ancien joueur" },
      undefined,
      201,
    );
    const old = newRoom("OLDABC", guest, questions, Date.now() - 1000);
    old.phase = "finished";
    old.reason = "forfeit";
    await server!.repository.save(old);
    const a: AuthResult = await request(
      "account/register",
      { username: "alice", password: pass },
      guest,
    );
    const b: AuthResult = await request("account/register", {
      username: "bob",
      password: pass,
    });
    const c: AuthResult = await request("account/register", {
      username: "eve",
      password: pass,
    });
    assert.equal(a.credentials.id, guest.id);
    assert.ok(a.recoveryCode);
    assert.equal(await server!.repository.authenticate(guest.token), null);
    await request(
      "account/register",
      { username: "ALICE", password: pass },
      undefined,
      409,
    );
    await request(
      "account/login",
      { username: "alice", password: "wrong" },
      undefined,
      401,
    );
    await request("account/me", undefined, undefined, 401);
    const login: AuthResult = await request("account/login", {
      username: "ALICE",
      password: pass,
    });
    assert.equal(login.credentials.id, a.credentials.id);
    const image = await sharp({
      create: { width: 16, height: 16, channels: 3, background: "#92AAE1" },
    })
      .png()
      .toBuffer();
    const photo = await request(
      "account/profile",
      {
        name: "Alice",
        photo: `data:image/png;base64,${image.toString("base64")}`,
      },
      a.credentials,
    );
    assert.match(photo.photo, /^data:image\/webp;base64,/);
    assert.equal(
      (await request("account/me", undefined, login.credentials)).photo,
      photo.photo,
    );
    await request(
      "account/profile",
      { photo: "data:image/svg+xml;base64,PHN2Zy8+" },
      a.credentials,
      400,
    );
    const pa = await client(a.credentials),
      pb = await client(b.credentials),
      pc = await client(c.credentials);
    await command(pa.s, "friends:request", { username: "bob" });
    await wait(() => pb.state.social!.incoming.length === 1);
    const friendship = pb.state.social!.incoming[0].id;
    await assert.rejects(
      command(pc.s, "friends:respond", { id: friendship, accept: true }),
    );
    await command(pb.s, "friends:respond", { id: friendship, accept: true });
    await wait(() => pa.state.social!.friends.length === 1);
    assert.equal(pa.state.social!.friends[0].presence, "online");
    await command(pb.s, "room:create", { mode: "solo" });
    await wait(() => pa.state.social!.friends[0].presence === "playing");
    await assert.rejects(
      command(pa.s, "friends:invite", { id: b.credentials.id }),
      /déjà/,
    );
    await command(pb.s, "room:leave");
    await wait(() => pa.state.social!.friends[0].presence === "online");
    await server!.repository.db.query(
      "UPDATE akasha_questions SET difficulty='expert'",
    );
    for (const q of questions)
      await server!.repository.questionBank.saveQuestion({
        ...q,
        id: `mcu-${q.id}`,
        themeId: "mcu",
        difficulty: "expert",
        status: "published",
      });
    const mcuProfile = await server!.repository.accounts.favorite(
      a.credentials.id,
      { themeId: "mcu", favorite: true },
    );
    assert.ok(mcuProfile.favorites.includes("mcu"));
    await command(pa.s, "friends:invite", {
      id: b.credentials.id,
      difficulty: "expert",
      themeId: "mcu",
    });
    await wait(
      () => pb.state.social!.invitations.length === 1 && !!pa.state.room,
    );
    const invited = pb.state.social!.invitations[0].id,
      firstCode = pa.state.room!.code;
    assert.equal(pa.state.room!.difficulty, "expert");
    assert.equal(pa.state.room!.themeId, "mcu");
    assert.equal(pb.state.social!.invitations[0].themeId, "mcu");
    assert.ok(
      server!.rooms
        .get(firstCode)!
        .questions.every((q) => q.id.startsWith("mcu-")),
    );
    assert.equal(pb.state.social!.friends[0].presence, "lobby");
    await assert.rejects(
      command(pc.s, "room:join", { code: firstCode }),
      /réservé/,
    );
    await assert.rejects(
      command(pc.s, "invitation:respond", { id: invited, accept: true }),
    );
    await command(pb.s, "invitation:respond", { id: invited, accept: true });
    await wait(() => pb.state.room?.code === firstCode);
    const secondDevice = await client(login.credentials);
    await wait(() => secondDevice.state.room?.code === firstCode);
    await command(pa.s, "room:ready");
    await command(pb.s, "room:ready");
    await wait(() => pa.state.social!.friends[0].presence === "playing");
    for (let round = 1; round <= 10; round++) {
      await wait(
        () =>
          pa.state.room?.phase === "question" && pa.state.room.round === round,
      );
      const correct =
        server!.rooms.get(firstCode)!.questions[round - 1].correct;
      await command(pa.s, "room:answer", { round, choice: correct });
      await command(pb.s, "room:answer", { round, choice: (correct + 1) % 4 });
    }
    await wait(() => pa.state.room?.phase === "finished");
    await wait(() => pa.state.social!.friends[0].presence === "online");
    const history: HistoryPage = await request(
      "account/history",
      undefined,
      a.credentials,
    );
    assert.equal(history.matches.length, 2);
    const match = history.matches[0];
    assert.equal(match.themeId, "mcu");
    const review = await request(
      `account/history/${encodeURIComponent(match.id)}`,
      undefined,
      b.credentials,
    );
    assert.equal(review.history.length, 10);
    assert.equal(review.themeId, "mcu");
    assert.equal(Object.hasOwn(review, "questions"), false);
    await request(
      `account/history/${encodeURIComponent(match.id)}`,
      undefined,
      c.credentials,
      404,
    );
    await Promise.all([
      command(pa.s, "room:rematch"),
      command(pb.s, "room:rematch"),
    ]);
    await wait(
      () =>
        pa.state.social!.invitations.length +
          pb.state.social!.invitations.length ===
        1,
    );
    const receiver = pa.state.social!.invitations.length ? pa : pb;
    await command(receiver.s, "invitation:respond", {
      id: receiver.state.social!.invitations[0].id,
      accept: true,
    });
    await wait(
      () =>
        pa.state.room?.phase === "lobby" &&
        pa.state.room.code !== firstCode &&
        pb.state.room?.code === pa.state.room.code,
    );
    assert.equal(pa.state.room!.players.length, 2);
    assert.equal(pa.state.room!.difficulty, "expert");
    assert.equal(pb.state.room!.difficulty, "expert");
    assert.equal(pa.state.room!.themeId, "mcu");
    assert.equal(pb.state.room!.themeId, "mcu");
    assert.ok(pa.state.room!.players.every((p) => !p.ready));
    await command(pa.s, "room:leave");
    await command(pb.s, "room:leave");
    await request(
      "account/recover",
      { username: "alice", code: a.recoveryCode, password: "Court!7" },
      undefined,
      400,
    );
    const recovered: AuthResult = await request("account/recover", {
      username: "alice",
      code: a.recoveryCode,
      password: nextPass,
    });
    assert.notEqual(recovered.recoveryCode, a.recoveryCode);
    await wait(() => !pa.s.connected && !secondDevice.s.connected);
    await request("account/me", undefined, a.credentials, 401);
    await request("account/me", undefined, login.credentials, 401);
    await request(
      "account/recover",
      { username: "alice", code: a.recoveryCode, password: pass },
      undefined,
      401,
    );
    await request(
      "account/login",
      { username: "alice", password: pass },
      undefined,
      401,
    );
    await request(
      "account/security",
      { currentPassword: nextPass, password: "Court!7" },
      recovered.credentials,
      400,
    );
    const updated: AuthResult = await request(
      "account/security",
      { currentPassword: nextPass, password: pass },
      recovered.credentials,
    );
    await request("account/me", undefined, recovered.credentials, 401);
    assert.notEqual(updated.recoveryCode, recovered.recoveryCode);
    clients.forEach((s) => s.disconnect());
    await server!.close();
    server = undefined;
    await start();
    assert.equal(
      (await request("account/me", undefined, updated.credentials)).name,
      "Alice",
    );
    const restored = await client(updated.credentials);
    assert.equal(
      restored.state.room,
      null,
      "A dismissed rematch must not reopen the previous result",
    );
    assert.equal(restored.state.social!.friends[0].id, b.credentials.id);
    assert.equal(restored.state.social!.friends[0].presence, "offline");
    assert.equal(
      (await request("account/history", undefined, updated.credentials)).matches
        .length,
      2,
    );
    await command(restored.s, "friends:invite", { id: b.credentials.id });
    const bobRestored = await client(b.credentials);
    await wait(() => bobRestored.state.social!.invitations.length === 1);
    const offlineInvite = bobRestored.state.social!.invitations[0].id;
    await server!.repository.db.query(
      "UPDATE akasha_invitations SET expires_at=$2 WHERE id=$1",
      [offlineInvite, Date.now() - 1],
    );
    await assert.rejects(
      command(bobRestored.s, "invitation:respond", {
        id: offlineInvite,
        accept: true,
      }),
      /expiré/,
    );
    await command(restored.s, "room:leave");
    await command(restored.s, "friends:invite", { id: b.credentials.id });
    await wait(
      () =>
        bobRestored.state.social!.invitations.length === 1 &&
        bobRestored.state.social!.invitations[0].id !== offlineInvite,
    );
    await command(bobRestored.s, "invitation:respond", {
      id: bobRestored.state.social!.invitations[0].id,
      accept: false,
    });
    await wait(() => restored.state.room === null);
    await command(restored.s, "friends:remove", { id: b.credentials.id });
    await wait(() => bobRestored.state.social!.friends.length === 0);
    await assert.rejects(
      command(restored.s, "friends:invite", { id: b.credentials.id }),
      /amis/,
    );
    await request("account/logout", {}, updated.credentials);
    await request("account/me", undefined, updated.credentials, 401);
    await wait(() => !restored.s.connected);
  } finally {
    clients.forEach((s) => s.disconnect());
    await server?.close();
    if (admin) {
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
    await rm(dir, { recursive: true, force: true });
  }
});
