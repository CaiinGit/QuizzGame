import { z } from "zod";
import { questions, themes, type Question, type ThemeId } from "./data";

const themeSchema = z.enum([
  "one-piece",
  "games",
  "cinema",
  "history",
  "geography",
  "science",
]);
const modeSchema = z.enum(["expedition", "survival", "daily"]);
export type Mode = z.infer<typeof modeSchema>;
export const modeNames: Record<Mode, string> = {
  expedition: "Expédition",
  survival: "Survie",
  daily: "Défi quotidien",
};
const answerSchema = z.object({
  questionId: z.string(),
  selected: z.number().int().min(0).max(3).nullable(),
  correct: z.boolean(),
});
const gameSchema = z.object({
  id: z.string(),
  mode: modeSchema,
  questionIds: z.array(z.string()).min(1).max(60),
  orders: z.array(z.array(z.number().int().min(0).max(3)).length(4)),
  index: z.number().int().nonnegative(),
  answers: z.array(answerSchema),
  phase: z.enum(["question", "feedback", "finished"]),
  deadline: z.number().nullable(),
  timed: z.boolean(),
  date: z.string(),
  xp: z.number().nonnegative(),
  coins: z.number().nonnegative(),
});
export type Game = z.infer<typeof gameSchema>;
const resultSchema = z.object({
  id: z.string(),
  mode: modeSchema,
  date: z.string(),
  correct: z.number(),
  total: z.number(),
  xp: z.number(),
  coins: z.number(),
});
export const stateSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1).max(24),
  avatar: z.enum(["leaf", "flame", "moon"]),
  xp: z.number().int().nonnegative(),
  coins: z.number().int().nonnegative(),
  favorites: z.array(themeSchema).min(1).max(6),
  timed: z.boolean(),
  dailyDate: z.string().nullable(),
  history: z.array(resultSchema).max(30),
  played: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  answered: z.number().int().nonnegative(),
  bestSurvival: z.number().int().nonnegative(),
  perfect: z.number().int().nonnegative(),
  mastered: z.array(themeSchema),
  active: gameSchema.nullable(),
});
export type State = z.infer<typeof stateSchema>;
export function initialState(): State {
  return {
    version: 1,
    name: "Aventurier",
    avatar: "leaf",
    xp: 0,
    coins: 0,
    favorites: ["one-piece", "games", "geography"],
    timed: true,
    dailyDate: null,
    history: [],
    played: 0,
    correct: 0,
    answered: 0,
    bestSurvival: 0,
    perfect: 0,
    mastered: [],
    active: null,
  };
}
export function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function levelInfo(xp: number) {
  const level = Math.floor(xp / 250) + 1;
  return {
    level,
    current: xp % 250,
    next: 250,
    title:
      level >= 10
        ? "Maître du savoir"
        : level >= 5
          ? "Érudit"
          : level >= 3
            ? "Éclaireur"
            : "Apprenti",
  };
}
export function seededRandom(seed: string) {
  let value = 2166136261;
  for (const char of seed)
    value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export const questionFor = (game: Game): Question =>
  questions.find((q) => q.id === game.questionIds[game.index])!;
export const correctCount = (game: Game) =>
  game.answers.filter((a) => a.correct).length;
export const livesLeft = (game: Game) =>
  Math.max(0, 3 - game.answers.filter((a) => !a.correct).length);
export const dailyAvailable = (state: State, now = new Date()) =>
  !state.dailyDate || state.dailyDate < dayKey(now);

export function startGame(
  state: State,
  mode: Mode,
  selected: ThemeId[],
  now: number,
  id: string,
): State {
  if (state.active)
    throw new Error(
      "Termine ou quitte ta partie en cours avant d’en lancer une autre.",
    );
  const date = dayKey(new Date(now));
  if (mode === "daily" && !dailyAvailable(state, new Date(now)))
    throw new Error("Tu as déjà commencé le défi du jour. Reviens demain !");
  const selection = mode === "daily" ? state.favorites : selected;
  const pool = questions.filter((q) => selection.includes(q.theme));
  if (pool.length < 10) throw new Error("Choisis au moins un thème.");
  const random = seededRandom(
    mode === "daily" ? `${date}-${[...selection].sort().join(",")}` : id,
  );
  const picked = shuffled(pool, random).slice(
    0,
    mode === "survival" ? pool.length : 10,
  );
  const timed = mode === "daily" || state.timed;
  return {
    ...state,
    dailyDate: mode === "daily" ? date : state.dailyDate,
    active: {
      id,
      mode,
      date,
      questionIds: picked.map((q) => q.id),
      orders: picked.map(() => shuffled([0, 1, 2, 3], random)),
      index: 0,
      answers: [],
      phase: "question",
      deadline: timed ? now + 20000 : null,
      timed,
      xp: 0,
      coins: 0,
    },
  };
}
// Expected question ID makes double taps and delayed timer callbacks harmless.
export function answerQuestion(
  state: State,
  questionId: string,
  selected: number | null,
  now: number,
): State {
  const game = state.active;
  if (
    !game ||
    game.phase !== "question" ||
    game.questionIds[game.index] !== questionId
  )
    return state;
  if (
    selected !== null &&
    (!Number.isInteger(selected) || selected < 0 || selected > 3)
  )
    return state;
  const expired = game.deadline !== null && now >= game.deadline;
  if (selected === null && !expired) return state;
  const choice = expired ? null : selected;
  const correct = choice !== null && choice === questionFor(game).correct;
  return {
    ...state,
    active: {
      ...game,
      phase: "feedback",
      answers: [...game.answers, { questionId, selected: choice, correct }],
    },
  };
}
export function nextQuestion(state: State, now: number): State {
  const game = state.active;
  if (!game || game.phase !== "feedback") return state;
  if (
    game.index + 1 >= game.questionIds.length ||
    (game.mode === "survival" && livesLeft(game) === 0)
  )
    return finishGame(state);
  return {
    ...state,
    active: {
      ...game,
      index: game.index + 1,
      phase: "question",
      deadline: game.timed ? now + 20000 : null,
    },
  };
}
function finishGame(state: State): State {
  const game = state.active!;
  const correct = correctCount(game);
  const xp = correct * 15 + 25;
  const coins = correct * 3 + (correct === game.answers.length ? 20 : 5);
  const completedThemes = themes
    .filter((t) => {
      const answers = game.answers.filter(
        (a) => questions.find((q) => q.id === a.questionId)?.theme === t.id,
      );
      return answers.length >= 10 && answers.every((a) => a.correct);
    })
    .map((t) => t.id);
  return {
    ...state,
    xp: state.xp + xp,
    coins: state.coins + coins,
    played: state.played + 1,
    correct: state.correct + correct,
    answered: state.answered + game.answers.length,
    perfect: state.perfect + Number(correct === game.answers.length),
    bestSurvival:
      game.mode === "survival"
        ? Math.max(state.bestSurvival, correct)
        : state.bestSurvival,
    mastered: [...new Set([...state.mastered, ...completedThemes])],
    history: [
      {
        id: game.id,
        mode: game.mode,
        date: game.date,
        correct,
        total: game.answers.length,
        xp,
        coins,
      },
      ...state.history,
    ].slice(0, 30),
    active: { ...game, phase: "finished", xp, coins },
  };
}
export function parseState(raw: string): State {
  const state = stateSchema.parse(JSON.parse(raw));
  const game = state.active;
  if (game) {
    const ids = game.questionIds;
    if (
      new Set(ids).size !== ids.length ||
      ids.some((id) => !questions.some((q) => q.id === id)) ||
      game.index >= ids.length ||
      game.orders.length !== ids.length ||
      game.orders.some((o) => new Set(o).size !== 4) ||
      game.answers.length !==
        game.index + (game.phase === "question" ? 0 : 1) ||
      game.answers.some(
        (a, i) =>
          a.questionId !== ids[i] ||
          a.correct !==
            (a.selected ===
              questions.find((q) => q.id === a.questionId)!.correct),
      ) ||
      (game.timed && game.deadline === null) ||
      (!game.timed && game.deadline !== null)
    ) {
      throw new Error("Sauvegarde de partie invalide");
    }
  }
  return state;
}
