import { randomInt } from "node:crypto";
import type { Phase, RoomView, GameMode } from "../shared/protocol";
import { pointsForTime } from "../shared/scoring";
import type { Question } from "./questions";
import type { DifficultyChoice } from "../shared/difficulty";
import type { ThemeId } from "../shared/themes";
export type Player = {
  id: string;
  name: string;
  ready: boolean;
  score: number;
  account?: boolean;
};
export type Room = {
  themeId?: ThemeId;
  difficulty?: DifficultyChoice;
  xpVersion?: 1;
  forfeitedBy?: string;
  reservedFor?: string;
  rematchOf?: string;
  mode: GameMode;
  code: string;
  phase: Phase;
  revision: number;
  createdAt: number;
  deadline: number;
  phaseStartedAt: number;
  phaseDuration: number;
  index: number;
  players: Player[];
  questions: Question[];
  answers: Record<string, number>;
  answerTimes: Record<string, number>;
  dismissed: string[];
  correction: RoomView["correction"];
  history: RoomView["history"];
  winnerId: string | null;
  reason: RoomView["reason"];
};
export type Durations = {
  question: number;
  reveal: number;
  countdown: number;
  lobby: number;
};
export const durations: Durations = {
  question: 20000,
  reveal: 4500,
  countdown: 3000,
  lobby: 30 * 60 * 1000,
};
export const isLive = (r: Room) => !["finished", "cancelled"].includes(r.phase);
function shuffle<T>(items: T[]) {
  const values = [...items];
  for (let i = values.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
export function newRoom(
  code: string,
  player: { id: string; name: string },
  questions: Question[],
  now: number,
  times = durations,
  mode: GameMode = "duel",
  difficulty: DifficultyChoice = "all",
  themeId: ThemeId = "one-piece",
): Room {
  if (questions.length < 10)
    throw new Error("Il faut dix questions pour créer une partie.");
  const picked = shuffle(questions)
    .slice(0, 10)
    .map((q) => {
      const order = shuffle([0, 1, 2, 3]);
      return {
        ...q,
        choices: order.map((i) => q.choices[i]),
        correct: order.indexOf(q.correct),
      };
    });
  return {
    xpVersion: 1,
    themeId,
    difficulty,
    mode,
    code,
    phase: mode === "solo" ? "countdown" : "lobby",
    revision: 1,
    createdAt: now,
    deadline: now + (mode === "solo" ? times.countdown : times.lobby),
    phaseStartedAt: now,
    phaseDuration: mode === "solo" ? times.countdown : times.lobby,
    index: 0,
    players: [{ ...player, ready: mode === "solo", score: 0 }],
    questions: picked,
    answers: {},
    answerTimes: {},
    dismissed: [],
    correction: null,
    history: [],
    winnerId: null,
    reason: null,
  };
}
export function join(room: Room, player: { id: string; name: string }) {
  if (
    room.reservedFor &&
    player.id !== room.reservedFor &&
    player.id !== room.players[0].id
  )
    throw new Error("Ce salon est réservé au joueur invité.");
  if (room.mode === "solo")
    throw new Error("Cette partie est réservée au jeu solo.");
  if (room.players.some((p) => p.id === player.id)) return;
  if (room.phase !== "lobby" || room.players.length >= 2)
    throw new Error("Ce salon est déjà complet ou la partie a commencé.");
  room.players.push({ ...player, ready: false, score: 0 });
  room.players.forEach((p) => (p.ready = false));
  room.revision++;
}
export function ready(
  room: Room,
  playerId: string,
  now: number,
  times = durations,
) {
  if (room.phase !== "lobby") throw new Error("La partie a déjà commencé.");
  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Tu ne fais pas partie de ce duel.");
  player.ready = true;
  room.revision++;
  if (
    room.players.length === (room.mode === "solo" ? 1 : 2) &&
    room.players.every((p) => p.ready)
  ) {
    startPhase(room, "countdown", now, times.countdown);
  }
}
function startPhase(room: Room, phase: Phase, now: number, duration: number) {
  room.phase = phase;
  room.phaseStartedAt = now;
  room.phaseDuration = duration;
  room.deadline = now + duration;
}
function reveal(room: Room, now: number, times: Durations) {
  const q = room.questions[room.index];
  const answers: NonNullable<RoomView["correction"]>["answers"] = {};
  for (const p of room.players) {
    const choice = room.answers[p.id] ?? null;
    const answeredAt = room.answerTimes[p.id];
    const points =
      choice === q.correct && answeredAt !== undefined
        ? pointsForTime(answeredAt - room.phaseStartedAt, room.phaseDuration)
        : 0;
    p.score += points;
    answers[p.id] = { choice, points };
  }
  room.correction = { correct: q.correct, explanation: q.explanation, answers };
  room.history.push({
    round: room.index + 1,
    question: q.text,
    choices: [...q.choices],
    correct: q.correct,
    answers: structuredClone(answers),
  });
  startPhase(room, "reveal", now, times.reveal);
  room.revision++;
}
export function tick(room: Room, now: number, times = durations) {
  if (!isLive(room) || now < room.deadline) return;
  if (room.phase === "lobby") {
    room.phase = "cancelled";
    room.reason = "expired";
  } else if (room.phase === "question") {
    reveal(room, now, times);
    return;
  } else if (room.phase === "countdown") {
    startPhase(room, "question", now, times.question);
  } else if (room.phase === "reveal") {
    if (room.index === room.questions.length - 1) {
      room.phase = "finished";
      room.reason = "completed";
      const [a, b] = room.players;
      room.winnerId =
        !b || a.score === b.score ? null : a.score > b.score ? a.id : b.id;
    } else {
      room.index++;
      room.answers = {};
      room.answerTimes = {};
      room.correction = null;
      startPhase(room, "question", now, times.question);
    }
  }
  room.revision++;
}
export function answer(
  room: Room,
  playerId: string,
  round: number,
  choice: number,
  now: number,
  times = durations,
) {
  if (!room.players.some((p) => p.id === playerId))
    throw new Error("Tu ne fais pas partie de ce duel.");
  if (
    room.phase !== "question" ||
    now >= room.deadline ||
    round !== room.index + 1
  )
    throw new Error("Cette question est terminée.");
  if (!Number.isInteger(choice) || choice < 0 || choice > 3)
    throw new Error("Réponse invalide.");
  if (Object.hasOwn(room.answers, playerId)) return;
  room.answers[playerId] = choice;
  room.answerTimes[playerId] = now;
  room.revision++;
  if (room.players.every((p) => Object.hasOwn(room.answers, p.id)))
    reveal(room, now, times);
}
export function leave(room: Room, playerId: string) {
  if (!room.players.some((p) => p.id === playerId))
    throw new Error("Tu ne fais pas partie de ce duel.");
  if (!room.dismissed.includes(playerId)) room.dismissed.push(playerId);
  if (isLive(room)) {
    room.forfeitedBy = playerId;
    if (room.phase === "lobby") {
      room.phase = "cancelled";
      room.reason = "forfeit";
    } else {
      room.phase = "finished";
      room.reason = "forfeit";
      room.winnerId = room.players.find((p) => p.id !== playerId)?.id ?? null;
    }
  }
  room.revision++;
}
export function view(
  room: Room,
  playerId: string,
  online: Set<string>,
  now: number,
): RoomView {
  if (!room.players.some((p) => p.id === playerId))
    throw new Error("Accès au salon refusé.");
  const show = room.phase === "question" || room.phase === "reveal";
  const q = room.questions[room.index];
  return {
    matchId: `${room.code}:${room.createdAt}`,
    themeId: room.themeId ?? "one-piece",
    difficulty: room.difficulty ?? "all",
    mode: room.mode,
    code: room.code,
    phase: room.phase,
    revision: room.revision,
    serverNow: now,
    deadline: room.deadline,
    phaseStartedAt: room.phaseStartedAt,
    phaseDuration: room.phaseDuration,
    round: room.index + 1,
    total: room.questions.length,
    hostId: room.players[0].id,
    players: room.players.map((p) => ({
      ...p,
      online: online.has(p.id),
      answered: Object.hasOwn(room.answers, p.id),
    })),
    question: show ? { text: q.text, choices: q.choices } : null,
    selected: room.answers[playerId] ?? null,
    submitted: Object.hasOwn(room.answers, playerId),
    history: room.phase === "finished" ? structuredClone(room.history) : [],
    correction: room.phase === "reveal" ? room.correction : null,
    winnerId: room.winnerId,
    reason: room.reason,
  };
}
