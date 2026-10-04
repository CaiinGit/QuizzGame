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
import { accountRoutes } from "./account-routes";
import { Social } from "./social";
import { difficultyChoices, type DifficultyChoice } from "../shared/difficulty";
import { themeIds, type ThemeId } from "../shared/themes";

export async function createApp(
  db: Sql,
  options: {
    origins?: string[];
    times?: Durations;
    staticDir?: string;
    testMode?: boolean;
    privateAccess?: boolean;
  } = {},
) {
  const adminOnly = options.privateAccess ?? true;
  const admitted = (p: Awaited<ReturnType<Repository["authenticate"]>>) =>
    !!p && !p.mustChangePassword && (!adminOnly || p.isAdmin);
  const repository = new Repository(db);
  await repository.init();
  const social = new Social(db);
  await social.init();
  const rooms = new Map((await repository.rooms()).map((r) => [r.code, r]));
  const times = options.times ?? durations;
  for (const room of rooms.values()) {
    // Older saved rooms predate solo and timing metadata. Preserve accepted
    // answers with full credit when their original receipt time is unknown.
    room.mode ??= "duel";
    room.history ??= [];
    room.phaseDuration ??=
      room.phase === "lobby"
        ? times.lobby
        : room.phase === "countdown"
          ? times.countdown
          : room.phase === "reading"
            ? times.reading
            : room.phase === "question"
              ? times.question
              : times.reveal;
    room.phaseStartedAt ??= room.deadline - room.phaseDuration;
    room.answerTimes ??= Object.fromEntries(
      Object.keys(room.answers).map((id) => [id, room.phaseStartedAt]),
    );
    if (room.phase === "lobby") {
      room.players.forEach((p) => (p.ready = false));
      room.revision++;
      await repository.save(room);
    }
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
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use("/api/account/profile", express.json({ limit: "320kb" }));
  app.use(express.json({ limit: "4kb" }));
  app.get("/api/access", (_req, res) =>
    res.set("Cache-Control", "no-store").json({ adminOnly }),
  );
  app.get("/api/health", async (_req, res) => {
    try {
      await db.query("SELECT 1");
      res.json({ ok: true, app: "Akasha", version: "0.7.0" });
    } catch {
      res.status(503).json({ ok: false });
    }
  });
  app.post("/api/session", async (req, res) => {
    if (adminOnly) {
      res.status(403).json({
        error: "Accès réservé aux administrateurs pendant les tests.",
      });
      return;
    }
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
  app.get("/api/questions/availability", async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!allow(`availability:${req.ip}`, 120)) {
      res.status(429).json({ error: "Patiente avant de réessayer." });
      return;
    }
    try {
      if (
        adminOnly &&
        !admitted(
          await repository.authenticate(
            req.headers.authorization?.replace(/^Bearer /, "") ?? "",
          ),
        )
      ) {
        res
          .status(403)
          .json({ error: "Connecte-toi pour choisir une difficulté." });
        return;
      }
      const theme = z
        .enum(themeIds)
        .default("one-piece")
        .safeParse(req.query.themeId);
      if (!theme.success) {
        res.status(400).json({ error: "Thème inconnu." });
        return;
      }
      res.json(await repository.questionBank.availability(theme.data));
    } catch {
      res.status(503).json({
        error: "Difficultés indisponibles. Réessaie dans un instant.",
      });
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
  async function refreshSocial() {
    const ids = new Set(
      [...io.sockets.sockets.values()]
        .filter((s) => s.data.player.account)
        .map((s) => s.data.player.id as string),
    );
    for (const id of ids) {
      const state = await social.state(id, online(), activities());
      for (const s of io.sockets.sockets.values())
        if (s.data.player.id === id) s.emit("social:state", state);
    }
  }
  function activities() {
    const result = new Map<string, "lobby" | "playing">();
    for (const room of rooms.values())
      if (isLive(room))
        for (const p of room.players)
          result.set(p.id, room.phase === "lobby" ? "lobby" : "playing");
    return result;
  }
  function revoke(id: string, token?: string) {
    for (const s of io.sockets.sockets.values())
      if (s.data.player.id === id && (!token || s.data.token === token)) {
        s.emit("auth:expired");
        s.disconnect(true);
      }
  }
  accountRoutes(app, repository, {
    adminOnly,
    allow,
    active,
    revoked: revoke,
    updated: async (id) => {
      const profile = await repository.accounts.profile(id);
      for (const s of io.sockets.sockets.values())
        if (s.data.player.id === id) {
          s.data.player.name = profile!.name;
          s.emit("account:profile", profile);
        }
      await refreshSocial();
    },
  });
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
    const previous = rooms.get(room.code);
    await repository.save(room);
    rooms.set(room.code, room);
    emit(room);
    if (room.phase === "finished" && previous?.phase !== "finished") {
      for (const p of room.players) {
        const profile = await repository.accounts.profile(p.id);
        if (profile)
          for (const s of io.sockets.sockets.values())
            if (s.data.player.id === p.id) s.emit("account:profile", profile);
      }
    }
    if (
      (!isLive(room) && (!previous || isLive(previous))) ||
      (room.players.length === 2 && previous?.players.length !== 2)
    ) {
      await db.query(
        "UPDATE akasha_invitations SET status='cancelled' WHERE kind='duel' AND room_code=$1 AND status='pending'",
        [room.code],
      );
      await refreshSocial();
    } else if ((room.phase === "lobby") !== (previous?.phase === "lobby"))
      await refreshSocial();
  }
  function attach(room: Room, id: string) {
    for (const s of io.sockets.sockets.values())
      if (s.data.player.id === id) s.data.room = room.code;
  }
  async function makeRoom(
    player: { id: string; name: string; account?: boolean },
    mode: "duel" | "solo" = "duel",
    difficulty: DifficultyChoice = "all",
    themeId: ThemeId = "one-piece",
  ) {
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
    return newRoom(
      code,
      player,
      await repository.questionBank.drawQuestions(themeId, difficulty),
      Date.now(),
      times,
      mode,
      difficulty,
      themeId,
    );
  }
  function active(id: string) {
    return [...rooms.values()].find(
      (r) => isLive(r) && r.players.some((p) => p.id === id),
    );
  }
  function resumable(id: string) {
    const latest =
      active(id) ??
      [...rooms.values()]
        .filter((r) => r.players.some((p) => p.id === id))
        .sort((a, b) => b.createdAt - a.createdAt)[0];
    return latest && !latest.dismissed.includes(id) ? latest : undefined;
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
      if (!player || !admitted(player)) throw new Error("SESSION_EXPIRED");
      if (
        [...io.sockets.sockets.values()].filter(
          (s) => s.data.player.id === player.id,
        ).length >= 5
      )
        throw new Error("Trop de connexions pour ce profil.");
      socket.data.player = player;
      socket.data.token = token;
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
    const player = socket.data.player as {
      id: string;
      name: string;
      account: boolean;
    };
    void refreshSocial().catch(() => {});
    const resume = resumable(player.id);
    if (resume) {
      socket.data.room = resume.code;
      emit(resume);
    } else socket.emit("room:state", null);
    socket.on("sync", (_data: unknown, ack: unknown) => {
      if (!allow(`sync:${player.id}`, 20)) return;
      void repository
        .authenticate(socket.data.token)
        .then((p) => {
          if (!admitted(p)) {
            socket.emit("auth:expired");
            socket.disconnect(true);
          } else {
            if (typeof ack === "function")
              ack({ ok: true, data: { serverNow: Date.now() } });
            const room = rooms.get(socket.data.room);
            if (room)
              socket.emit(
                "room:state",
                view(room, player.id, online(), Date.now()),
              );
            if (p!.account)
              return social
                .state(p!.id, online(), activities())
                .then((state) => socket.emit("social:state", state));
          }
        })
        .catch(() => {});
    });
    const command = (
      name: string,
      handler: (data: unknown, receivedAt: number) => Promise<unknown>,
    ) =>
      socket.on(name, (data: unknown, ack: unknown) => {
        if (typeof ack !== "function") return;
        const receivedAt = Date.now();
        void serial(async () => {
          if (!admitted(await repository.authenticate(socket.data.token))) {
            socket.emit("auth:expired");
            socket.disconnect(true);
            throw new Error("Session expirée. Reconnecte-toi.");
          }
          if (!allow(`event:${player.id}`, 80))
            throw new Error("Trop de demandes. Patiente quelques secondes.");
          return handler(data, receivedAt);
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
    const mutate = async (fn: (room: Room) => void, now = Date.now()) => {
      const current = rooms.get(socket.data.room);
      if (!current) throw new Error("Aucun duel actif.");
      const draft = structuredClone(current);
      tick(draft, now, times);
      // Persist an expired round even when the requested action is rejected.
      if (draft.revision !== current.revision) await persist(draft);
      const updated = structuredClone(draft);
      fn(updated);
      if (updated.revision !== draft.revision) await persist(updated);
    };
    command("room:create", async (data) => {
      const { mode, difficulty, themeId } = z
        .object({
          mode: z.enum(["duel", "solo"]).default("duel"),
          difficulty: z.enum(difficultyChoices).default("all"),
          themeId: z.enum(themeIds).default("one-piece"),
        })
        .parse(data);
      const existing = active(player.id);
      if (existing) {
        socket.data.room = existing.code;
        emit(existing);
        return;
      }
      const room = await makeRoom(player, mode, difficulty, themeId);
      await repository.save(room);
      rooms.set(room.code, room);
      attach(room, player.id);
      emit(room);
      await refreshSocial();
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
      attach(room, player.id);
      emit(room);
      await db.query(
        "UPDATE akasha_invitations SET status=CASE WHEN recipient=$2 THEN 'accepted' ELSE 'cancelled' END WHERE kind='duel' AND room_code=$1 AND status='pending'",
        [code, player.id],
      );
      await refreshSocial();
    });
    const accountOnly = () => {
      if (!player.account)
        throw new Error(
          "Crée un compte pour retrouver tes amis et tes invitations.",
        );
    };
    command("friends:request", async (data) => {
      accountOnly();
      if (!allow(`friend-request:${player.id}`, 10, 3600000))
        throw new Error("Trop de demandes d’amis. Réessaie plus tard.");
      await social.request(
        player.id,
        z.object({ username: z.string() }).parse(data).username,
      );
      await refreshSocial();
    });
    command("friends:respond", async (data) => {
      accountOnly();
      const d = z
        .object({ id: z.string().uuid(), accept: z.boolean() })
        .parse(data);
      await social.respond(player.id, d.id, d.accept);
      await refreshSocial();
    });
    command("friends:remove", async (data) => {
      accountOnly();
      const d = z.object({ id: z.string().uuid() }).parse(data);
      await social.remove(player.id, d.id);
      await refreshSocial();
    });
    command("friends:invite", async (data) => {
      accountOnly();
      const d = z
        .object({
          id: z.string().uuid(),
          difficulty: z.enum(difficultyChoices).default("all"),
          themeId: z.enum(themeIds).default("one-piece"),
        })
        .parse(data);
      if (!(await social.areFriends(player.id, d.id)))
        throw new Error("Ajoute d’abord ce joueur à tes amis.");
      if (active(d.id))
        throw new Error(
          "Cet ami est déjà dans un salon ou en partie. Attends qu’il soit disponible.",
        );
      if (!allow(`invite:${player.id}`, 12, 60000))
        throw new Error("Patiente avant d’envoyer une autre invitation.");
      let room = active(player.id);
      if (
        room &&
        (room.phase !== "lobby" ||
          room.players.length !== 1 ||
          room.mode !== "duel" ||
          (room.reservedFor && room.reservedFor !== d.id))
      )
        throw new Error("Quitte ton salon actuel avant d’inviter cet ami.");
      room = structuredClone(
        room ?? (await makeRoom(player, "duel", d.difficulty, d.themeId)),
      );
      room.reservedFor = d.id;
      await repository.save(room);
      rooms.set(room.code, room);
      attach(room, player.id);
      await social.invite(player.id, d.id, "duel", room.code);
      emit(room);
      await refreshSocial();
    });
    command("room:rematch", async () => {
      accountOnly();
      const source = rooms.get(socket.data.room);
      if (
        !source ||
        source.phase !== "finished" ||
        source.mode !== "duel" ||
        source.players.length !== 2
      )
        throw new Error("La revanche est disponible après un duel.");
      const opponent = source.players.find((p) => p.id !== player.id)!;
      if (!(await repository.accounts.profile(opponent.id)))
        throw new Error(
          "Ton adversaire doit créer un compte pour recevoir une revanche.",
        );
      if (active(player.id) || active(opponent.id))
        throw new Error("Un joueur est déjà dans une autre partie.");
      if (!allow(`rematch:${player.id}`, 6, 60000))
        throw new Error("Patiente avant de redemander une revanche.");
      await social.invite(
        player.id,
        opponent.id,
        "rematch",
        source.code,
        `${source.code}:${source.createdAt}`,
      );
      await refreshSocial();
    });
    command("invitation:respond", async (data) => {
      accountOnly();
      const d = z
        .object({ id: z.string().uuid(), accept: z.boolean() })
        .parse(data);
      const invitation = await social.getInvite(d.id);
      if (
        !invitation ||
        (invitation.recipient !== player.id &&
          !(invitation.sender === player.id && !d.accept))
      )
        throw new Error("Invitation introuvable.");
      if (
        invitation.status !== "pending" ||
        Number(invitation.expires_at) <= Date.now()
      )
        throw new Error("Cette invitation a expiré ou a déjà été traitée.");
      if (!d.accept) {
        await social.resolve(
          invitation.id,
          invitation.sender === player.id ? "cancelled" : "declined",
        );
        const source = rooms.get(invitation.room_code);
        if (
          invitation.kind === "duel" &&
          source?.phase === "lobby" &&
          source.players.length === 1 &&
          source.reservedFor === invitation.recipient
        ) {
          const closed = structuredClone(source);
          leave(closed, invitation.sender);
          await persist(closed);
          for (const peer of io.sockets.sockets.values())
            if (peer.data.room === closed.code) {
              peer.data.room = null;
              peer.emit("room:state", null);
            }
        }
        await refreshSocial();
        return;
      }
      const sender = await repository.accounts.profile(invitation.sender);
      if (!sender) throw new Error("Ce joueur n’est plus disponible.");
      let room: Room;
      if (invitation.kind === "duel") {
        if (!(await social.areFriends(player.id, sender.id)))
          throw new Error("Vous n’êtes plus amis.");
        const source = rooms.get(invitation.room_code);
        if (
          !source ||
          source.phase !== "lobby" ||
          source.deadline <= Date.now() ||
          source.players.length !== 1 ||
          source.players[0].id !== sender.id
        )
          throw new Error("Ce salon n’est plus disponible.");
        if (active(player.id) && active(player.id)!.code !== source.code)
          throw new Error("Quitte ta partie actuelle avant d’accepter.");
        room = structuredClone(source);
        join(room, player);
      } else {
        const source = rooms.get(invitation.room_code);
        if (
          !source ||
          `${source.code}:${source.createdAt}` !== invitation.origin_key ||
          source.phase !== "finished" ||
          !source.players.some((p) => p.id === player.id) ||
          !source.players.some((p) => p.id === sender.id)
        )
          throw new Error("Ce duel n’est plus disponible pour une revanche.");
        if (active(player.id) || active(sender.id))
          throw new Error("Un joueur est déjà dans une autre partie.");
        room = await makeRoom(
          {
            id: sender.id,
            name: sender.name,
            account: true,
          },
          "duel",
          source.difficulty ?? "all",
          source.themeId ?? "one-piece",
        );
        room.rematchOf = invitation.id;
        room.reservedFor = player.id;
        join(room, player);
      }
      await repository.save(room);
      rooms.set(room.code, room);
      attach(room, sender.id);
      attach(room, player.id);
      await social.resolve(invitation.id, "accepted", room.code);
      emit(room);
      await refreshSocial();
    });
    command("room:ready", async (_data, receivedAt) =>
      mutate((room) => {
        if (
          room.players.length !== (room.mode === "solo" ? 1 : 2) ||
          !room.players.every((p) => online().has(p.id))
        )
          throw new Error("Attends que vous soyez tous les deux connectés.");
        ready(room, player.id, Date.now(), times);
      }, receivedAt),
    );
    command("room:answer", async (data, receivedAt) => {
      const input = z
        .object({
          round: z.number().int().min(1).max(10),
          choice: z.number().int().min(0).max(3),
        })
        .parse(data);
      await mutate(
        (room) =>
          answer(room, player.id, input.round, input.choice, receivedAt, times),
        receivedAt,
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
      void refreshSocial().catch(() => {});
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
      const scheduledAt = Date.now();
      void serial(async () => {
        for (const current of rooms.values()) {
          // Don't expire a question ahead of answers already received while
          // this timer job was waiting for persistence in the queue.
          if (!isLive(current) || scheduledAt < current.deadline) continue;
          const room = structuredClone(current);
          tick(
            room,
            room.phase === "question" ? scheduledAt : Date.now(),
            times,
          );
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
