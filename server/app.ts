import express from "express";
import { createServer } from "node:http";
import { randomInt } from "node:crypto";
import { resolve } from "node:path";
import { Server } from "socket.io";
import { z } from "zod";
import { Repository, type Sql } from "./database";
import {
  newRoom,
  join,
  ready,
  answer,
  leave,
  tick,
  view,
  isLive,
  durations,
  type Room,
  type Durations,
} from "./engine";
import type { Ack } from "../shared/protocol";

export async function createApp(
  db: Sql,
  options: {
    origins?: string[];
    times?: Durations;
    staticDir?: string;
    testMode?: boolean;
  } = {},
) {
  const repository = new Repository(db);
  await repository.init();
  const rooms = new Map((await repository.rooms()).map((r) => [r.code, r]));
  const times = options.times ?? durations;
  for (const room of rooms.values())
    if (room.phase === "lobby") {
      room.players.forEach((p) => (p.ready = false));
      room.revision++;
      await repository.save(room);
    }
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", process.env.TRUST_PROXY === "1" ? 1 : false);
  const http = createServer(app);
  const origins = options.origins ?? [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://localhost",
    "capacitor://localhost",
  ];
  const originAllowed = (origin?: string) =>
    !origin || origins.includes(origin);
  const io = new Server(http, {
    cors: { origin: (origin, cb) => cb(null, originAllowed(origin)) },
    allowRequest: (req, cb) => cb(null, originAllowed(req.headers.origin)),
    maxHttpBufferSize: 8192,
  });
  const limits = new Map<string, { count: number; until: number }>();
  function allow(key: string, max = 80, window = 60000) {
    const now = Date.now();
    let entry = limits.get(key);
    if (!entry || now > entry.until) {
      entry = { count: 0, until: now + window };
      limits.set(key, entry);
    }
    return ++entry.count <= max;
  }
  app.use((req, res, next) => {
    if (!originAllowed(req.headers.origin)) {
      res.status(403).json({ error: "Origine non autorisée." });
      return;
    }
    if (req.headers.origin)
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json({ limit: "4kb" }));
  app.get("/api/health", async (_req, res) => {
    try {
      await db.query("SELECT 1");
      res.json({ ok: true, app: "Akasha", version: "0.3.0" });
    } catch {
      res.status(503).json({ ok: false });
    }
  });
  app.post("/api/session", async (req, res) => {
    if (!allow(`session:${req.ip}`, 12, 3600000)) {
      res
        .status(429)
        .json({ error: "Trop de tentatives. Réessaie plus tard." });
      return;
    }
    const parsed = z
      .object({
        name: z
          .string()
          .trim()
          .min(2)
          .max(20)
          .regex(/^[\p{L}\p{N} _.-]+$/u),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Choisis un pseudo de 2 à 20 lettres ou chiffres." });
      return;
    }
    try {
      res.status(201).json(await repository.session(parsed.data.name));
    } catch (e) {
      console.error("session persistence failed", e);
      res
        .status(503)
        .json({ error: "Le serveur est temporairement indisponible." });
    }
  });
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(job: () => Promise<T>): Promise<T> => {
    const task = queue.then(job);
    queue = task.catch(() => undefined);
    return task;
  };
  const online = () =>
    new Set(
      [...io.sockets.sockets.values()].map((s) => s.data.player.id as string),
    );
  function emit(room: Room) {
    const present = online();
    for (const socket of io.sockets.sockets.values())
      if (socket.data.room === room.code)
        socket.emit(
          "room:state",
          view(room, socket.data.player.id, present, Date.now()),
        );
  }
  async function persist(room: Room) {
    await repository.save(room);
    rooms.set(room.code, room);
    emit(room);
  }
  function active(id: string) {
    return [...rooms.values()].find(
      (r) => isLive(r) && r.players.some((p) => p.id === id),
    );
  }
  function resumable(id: string) {
    return [...rooms.values()]
      .reverse()
      .find(
        (r) => r.players.some((p) => p.id === id) && !r.dismissed.includes(id),
      );
  }
  io.use(async (socket, next) => {
    try {
      if (!allow(`connect:${socket.handshake.address}`, 100))
        throw new Error("Trop de connexions.");
      const token = z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .parse(socket.handshake.auth?.token);
      const player = await repository.authenticate(token);
      if (!player) throw new Error("SESSION_EXPIRED");
      if (
        [...io.sockets.sockets.values()].filter(
          (s) => s.data.player.id === player.id,
        ).length >= 5
      )
        throw new Error("Trop de connexions pour ce profil.");
      socket.data.player = player;
      next();
    } catch (e) {
      next(
        new Error(
          e instanceof Error && e.message === "SESSION_EXPIRED"
            ? "SESSION_EXPIRED"
            : "Connexion refusée.",
        ),
      );
    }
  });
  io.on("connection", (socket) => {
    const player = socket.data.player as { id: string; name: string };
    const resume = resumable(player.id);
    if (resume) {
      socket.data.room = resume.code;
      emit(resume);
    } else socket.emit("room:state", null);
    socket.on("sync", (_data: unknown, ack: unknown) => {
      if (!allow(`sync:${player.id}`, 20)) return;
      if (typeof ack === "function")
        ack({ ok: true, data: { serverNow: Date.now() } });
      const room = rooms.get(socket.data.room);
      if (room)
        socket.emit("room:state", view(room, player.id, online(), Date.now()));
    });
    const command = (
      name: string,
      handler: (data: unknown) => Promise<unknown>,
    ) =>
      socket.on(name, (data: unknown, ack: unknown) => {
        if (typeof ack !== "function") return;
        void serial(async () => {
          if (!allow(`event:${player.id}`, 80))
            throw new Error("Trop de demandes. Patiente quelques secondes.");
          return handler(data);
        })
          .then((result) =>
            (ack as (r: Ack<unknown>) => void)({ ok: true, data: result }),
          )
          .catch((e) => {
            const message =
              e instanceof z.ZodError
                ? "Demande invalide."
                : e instanceof Error
                  ? e.message
                  : "Action impossible.";
            (ack as (r: Ack<unknown>) => void)({ ok: false, error: message });
          });
      });
    const mutate = async (fn: (room: Room) => void) => {
      const current = rooms.get(socket.data.room);
      if (!current) throw new Error("Aucun duel actif.");
      const draft = structuredClone(current);
      tick(draft, Date.now(), times);
      // Persist an expired round even when the requested action is rejected.
      if (draft.revision !== current.revision) await persist(draft);
      const updated = structuredClone(draft);
      fn(updated);
      if (updated.revision !== draft.revision) await persist(updated);
    };
    command("room:create", async () => {
      const existing = active(player.id);
      if (existing) {
        socket.data.room = existing.code;
        emit(existing);
        return;
      }
      if ([...rooms.values()].filter(isLive).length >= 200)
        throw new Error("Tous les salons sont occupés. Réessaie bientôt.");
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      do {
        code = Array.from(
          { length: 6 },
          () => alphabet[randomInt(alphabet.length)],
        ).join("");
      } while (rooms.has(code));
      const room = newRoom(code, player, Date.now(), times);
      await repository.save(room);
      rooms.set(code, room);
      socket.data.room = code;
      emit(room);
    });
    command("room:join", async (data) => {
      const { code } = z
        .object({
          code: z
            .string()
            .trim()
            .toUpperCase()
            .regex(/^[A-Z2-9]{6}$/),
        })
        .parse(data);
      const current = rooms.get(code);
      if (!current)
        throw new Error("Salon introuvable. Vérifie le code avec ton ami.");
      const existing = active(player.id);
      if (existing && existing.code !== code)
        throw new Error(
          "Quitte ton salon actuel avant d’en rejoindre un autre.",
        );
      const room = structuredClone(current);
      tick(room, Date.now(), times);
      join(room, player);
      if (!isLive(room) || room.dismissed.includes(player.id))
        throw new Error("Ce salon est terminé. Crée un nouveau duel.");
      await repository.save(room);
      rooms.set(code, room);
      socket.data.room = code;
      emit(room);
    });
    command("room:ready", async () =>
      mutate((room) => {
        if (
          room.players.length !== 2 ||
          !room.players.every((p) => online().has(p.id))
        )
          throw new Error("Attends que vous soyez tous les deux connectés.");
        ready(room, player.id, Date.now(), times);
      }),
    );
    command("room:answer", async (data) => {
      const input = z
        .object({
          round: z.number().int().min(1).max(10),
          choice: z.number().int().min(0).max(3),
        })
        .parse(data);
      await mutate((room) =>
        answer(room, player.id, input.round, input.choice, Date.now(), times),
      );
    });
    command("room:leave", async () => {
      await mutate((room) => leave(room, player.id));
      for (const peer of io.sockets.sockets.values())
        if (peer.data.player.id === player.id) {
          peer.data.room = null;
          peer.emit("room:state", null);
        }
    });
    socket.on("disconnect", () => {
      void serial(async () => {
        const current = rooms.get(socket.data.room);
        if (!current) return;
        const room = structuredClone(current);
        if (room.phase === "lobby" && !online().has(player.id)) {
          room.players.forEach((p) => (p.ready = false));
          room.revision++;
          await persist(room);
        } else emit(room);
      }).catch((e) => console.error("disconnect persistence failed", e));
    });
  });
  let ticking = false;
  const timer = setInterval(
    () => {
      if (ticking) return;
      ticking = true;
      void serial(async () => {
        for (const current of rooms.values()) {
          if (!isLive(current) || Date.now() < current.deadline) continue;
          const room = structuredClone(current);
          tick(room, Date.now(), times);
          if (room.revision !== current.revision) await persist(room);
        }
        for (const [key, entry] of limits)
          if (Date.now() > entry.until) limits.delete(key);
      })
        .catch((e) => console.error("tick persistence failed", e))
        .finally(() => (ticking = false));
    },
    options.testMode ? 25 : 200,
  );
  if (options.staticDir)
    app.use(
      express.static(resolve(options.staticDir), {
        index: "index.html",
        dotfiles: "deny",
      }),
    );
  app.use((_req, res) =>
    res.status(404).json({ error: "Ressource introuvable." }),
  );
  return {
    app,
    http,
    io,
    repository,
    rooms,
    close: async () => {
      clearInterval(timer);
      await queue;
      await new Promise<void>((done) => io.close(() => done()));
      await queue;
      await db.close();
    },
  };
}
