import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { io, type Socket } from "socket.io-client";
import { createApp } from "./app";
import { connectDatabase } from "./database";
import { durations } from "./engine";
import type { RoomView, Ack, Credentials } from "../shared/protocol";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn: () => boolean) {
  for (let i = 0; i < 160; i++) {
    if (fn()) return;
    await pause(25);
  }
  throw Error("State timeout");
}
async function request(socket: Socket, event: string, data: unknown = {}) {
  return new Promise<void>((resolve, reject) =>
    socket
      .timeout(2000)
      .emit(event, data, (e: Error | null, r: Ack<unknown>) =>
        e ? reject(e) : r.ok ? resolve() : reject(Error(r.error)),
      ),
  );
}
test("real clients: joining, privacy, duplicate requests, reconnect, persisted restart and forfeit", async () => {
  const directory = await mkdtemp(join(tmpdir(), "akasha-"));
  let server: Awaited<ReturnType<typeof createApp>> | undefined;
  const clients: Socket[] = [];
  try {
    async function start() {
      server = await createApp(
        await connectDatabase(process.env.TEST_DATABASE_URL, directory),
        {
          testMode: true,
          times: {
            ...durations,
            countdown: 70,
            question: 30000,
            reveal: 30000,
          },
        },
      );
      await new Promise<void>((r) => server!.http.listen(0, "127.0.0.1", r));
      const addr = server.http.address();
      return `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
    }
    let base = await start();
    async function session(name: string): Promise<Credentials> {
      const response = await fetch(base + "/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      assert.equal(response.status, 201);
      return response.json();
    }
    async function client(c: Credentials) {
      const s = io(base, {
        auth: { token: c.token },
        reconnection: false,
        autoConnect: false,
      });
      clients.push(s);
      let state: RoomView | null = null;
      s.on("room:state", (r) => {
        state = r;
      });
      await new Promise<void>((resolve, reject) => {
        s.once("connect", resolve);
        s.once("connect_error", reject);
        s.connect();
      });
      return { s, state: () => state };
    }
    assert.equal(
      (
        await fetch(base + "/api/health", {
          headers: { Origin: "https://bad.example" },
        })
      ).status,
      403,
    );
    const ca = await session("Luffy"),
      cb = await session("Zoro"),
      cc = await session("Nami");
    const a = await client(ca),
      b = await client(cb),
      c = await client(cc);
    const hashed = await server!.repository.db.query<{ token_hash: string }>(
      "SELECT token_hash FROM akasha_sessions WHERE id=$1",
      [ca.id],
    );
    assert.notEqual(hashed.rows[0].token_hash, ca.token);
    await request(a.s, "room:create");
    await waitFor(() => !!a.state());
    const code = a.state()!.code;
    await request(b.s, "room:join", { code });
    await assert.rejects(request(c.s, "room:join", { code }));
    await request(a.s, "room:ready");
    await request(b.s, "room:ready");
    await waitFor(
      () => a.state()?.phase === "question" && b.state()?.phase === "question",
    );
    assert.deepEqual(a.state()!.question, b.state()!.question);
    assert.equal(a.state()!.correction, null);
    const correct = server!.rooms.get(code)!.questions[0].correct;
    await Promise.all([
      request(a.s, "room:answer", { round: 1, choice: correct }),
      request(a.s, "room:answer", { round: 1, choice: (correct + 1) % 4 }),
    ]);
    await waitFor(() => !!a.state()?.submitted);
    assert.equal(a.state()!.selected, correct);
    assert.equal(b.state()!.selected, null);
    assert.equal(b.state()!.correction, null);
    a.s.disconnect();
    const reconnect = await client(ca);
    await waitFor(() => !!reconnect.state()?.submitted);
    assert.equal(reconnect.state()!.code, code);
    await request(b.s, "room:answer", { round: 1, choice: correct });
    await waitFor(() => reconnect.state()?.phase === "reveal");
    assert.equal(reconnect.state()!.players[0].score, 1000);
    clients.forEach((s) => s.disconnect());
    await server!.close();
    server = undefined;
    base = await start();
    const restored = await client(ca);
    await waitFor(() => restored.state()?.code === code);
    assert.equal(restored.state()!.players[0].score, 1000);
    assert.equal(restored.state()!.phase, "reveal");
    await request(restored.s, "room:leave");
    const other = await client(cb);
    await waitFor(() => other.state()?.phase === "finished");
    assert.equal(other.state()!.winnerId, cb.id);
    const expired = io(base, {
      auth: { token: "a".repeat(64) },
      reconnection: false,
      autoConnect: false,
    });
    clients.push(expired);
    const error = await new Promise<Error>((resolve) => {
      expired.once("connect_error", resolve);
      expired.connect();
    });
    assert.equal(error.message, "SESSION_EXPIRED");
  } finally {
    clients.forEach((s) => s.disconnect());
    await server?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
