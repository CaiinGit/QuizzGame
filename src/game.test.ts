import { test } from "node:test";
import assert from "node:assert/strict";
import { questions, themes } from "./data";
import {
  answerQuestion,
  dailyAvailable,
  initialState,
  levelInfo,
  livesLeft,
  nextQuestion,
  parseState,
  questionFor,
  startGame,
  type Mode,
  type State,
} from "./game";

const now = new Date(2026, 8, 24, 12).getTime();
const start = (mode: Mode = "expedition", state = initialState()) =>
  startGame(state, mode, ["one-piece"], now, "session-a");
function answer(state: State, correct = true): State {
  const q = questionFor(state.active!);
  return answerQuestion(
    state,
    q.id,
    correct ? q.correct : (q.correct + 1) % 4,
    now + 1000,
  );
}
function finish(state: State, correct = true): State {
  while (state.active?.phase !== "finished")
    state = nextQuestion(answer(state, correct), now);
  return state;
}

test("bank: 60 unique complete questions, 10 per theme, 4 distinct answers", () => {
  assert.equal(questions.length, 60);
  assert.equal(new Set(questions.map((q) => q.id)).size, 60);
  for (const t of themes)
    assert.equal(questions.filter((q) => q.theme === t.id).length, 10);
  for (const q of questions) {
    assert.equal(new Set(q.choices).size, 4);
    assert.ok(q.choices[q.correct]);
    assert.ok(q.explanation.length > 10);
  }
});
test("expedition is 10 questions without repetitions; answer positions are shuffled", () => {
  const state = start();
  assert.equal(state.active!.questionIds.length, 10);
  assert.equal(new Set(state.active!.questionIds).size, 10);
  assert.ok(state.active!.orders.some((order) => order[0] !== 0));
});
test("correct and wrong choices are scored once, including duplicate callbacks", () => {
  const state = start();
  const q = questionFor(state.active!);
  const answered = answer(state);
  assert.equal(answered.active!.answers[0].correct, true);
  assert.equal(answerQuestion(answered, q.id, 0, now), answered);
  const next = nextQuestion(answered, now);
  assert.equal(answerQuestion(next, q.id, 0, now), next);
  assert.equal(answer(next, false).active!.answers[1].correct, false);
});
test("deadline: exact expiry is too late, with no reward for a late correct answer", () => {
  const state = start();
  const q = questionFor(state.active!);
  const late = answerQuestion(state, q.id, q.correct, now + 20000);
  assert.equal(late.active!.answers[0].selected, null);
  assert.equal(late.active!.answers[0].correct, false);
  assert.equal(answerQuestion(state, q.id, null, now + 19000), state);
  assert.equal(
    answerQuestion(state, q.id, q.correct, now + 19999).active!.answers[0]
      .correct,
    true,
  );
});
test("perfect run grants XP, coins, history, mastery and cannot be claimed twice", () => {
  const result = finish(start());
  assert.equal(result.xp, 175);
  assert.equal(result.coins, 50);
  assert.equal(result.played, 1);
  assert.equal(result.perfect, 1);
  assert.equal(result.correct, 10);
  assert.deepEqual(result.mastered, ["one-piece"]);
  assert.equal(result.history.length, 1);
  assert.equal(nextQuestion(result, now), result);
  assert.equal(result.active!.phase, "finished");
});
test("survival stops at three mistakes and records actual answered count", () => {
  const state = finish(start("survival"), false);
  assert.equal(livesLeft(state.active!), 0);
  assert.equal(state.active!.answers.length, 3);
  assert.equal(state.answered, 3);
  assert.equal(state.correct, 0);
  assert.equal(state.bestSurvival, 0);
});
test("survival completes a finite bank without repeated questions", () => {
  const state = finish(start("survival"));
  assert.equal(state.bestSurvival, 10);
  assert.equal(state.active!.answers.length, 10);
});
test("daily is consumed at start, survives abandonment and uses favorites", () => {
  const state = start("daily", { ...initialState(), favorites: ["geography"] });
  assert.ok(
    state.active!.questionIds.every((id) => id.startsWith("geography-")),
  );
  assert.equal(dailyAvailable(state, new Date(now)), false);
  const abandoned = { ...state, active: null };
  assert.throws(() => start("daily", abandoned));
  assert.equal(dailyAvailable(abandoned, new Date(2026, 8, 25, 0)), true);
  assert.equal(dailyAvailable(abandoned, new Date(2026, 8, 23, 0)), false);
});
test("daily is deterministic for date and favorite set, independent of order", () => {
  const a = start("daily", {
    ...initialState(),
    favorites: ["cinema", "geography"],
  });
  const b = start("daily", {
    ...initialState(),
    favorites: ["geography", "cinema"],
  });
  assert.deepEqual(a.active!.questionIds, b.active!.questionIds);
  assert.deepEqual(a.active!.orders, b.active!.orders);
});
test("untimed mode has no timeout; daily always uses a deadline", () => {
  const state = start("expedition", { ...initialState(), timed: false });
  assert.equal(state.active!.deadline, null);
  assert.equal(
    answerQuestion(state, questionFor(state.active!).id, null, now + 999999),
    state,
  );
  assert.equal(
    start("daily", { ...initialState(), timed: false }).active!.deadline,
    now + 20000,
  );
});
test("saved in-progress, feedback and finished states round-trip; deadlines are preserved", () => {
  for (const state of [start(), answer(start()), finish(start())])
    assert.deepEqual(parseState(JSON.stringify(state)), state);
});
test("invalid or stale save is rejected without pretending it is valid", () => {
  assert.throws(() => parseState("bad"));
  assert.throws(() => parseState('{"version":3}'));
  const state = start();
  state.active!.questionIds[0] = "deleted-question";
  assert.throws(() => parseState(JSON.stringify(state)));
  const malformed = start();
  malformed.active!.orders[0] = [0, 0, 0, 0];
  assert.throws(() => parseState(JSON.stringify(malformed)));
});
test("level boundaries, active session protection, empty pool and invalid choices", () => {
  assert.equal(levelInfo(249).level, 1);
  assert.equal(levelInfo(250).level, 2);
  assert.equal(levelInfo(250).current, 0);
  assert.throws(() => startGame(start(), "expedition", ["games"], now, "b"));
  assert.throws(() => startGame(initialState(), "expedition", [], now, "b"));
  const state = start();
  assert.equal(
    answerQuestion(state, questionFor(state.active!).id, 9, now),
    state,
  );
});
