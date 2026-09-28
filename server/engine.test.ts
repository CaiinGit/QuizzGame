import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newRoom,
  join,
  ready,
  answer,
  tick,
  view,
  leave,
  durations,
} from "./engine";
import { pointsForTime } from "../shared/scoring";
const a = { id: "a", name: "Luffy" },
  b = { id: "b", name: "Zoro" };
function started() {
  const r = newRoom("ABCDEF", a, 0);
  join(r, b);
  ready(r, a.id, 0);
  ready(r, b.id, 0);
  tick(r, durations.countdown);
  return r;
}
test("same shuffled questions for both players; no answer keys before reveal", () => {
  const r = started();
  const first = view(r, "a", new Set(), 3000),
    second = view(r, "b", new Set(), 3000);
  assert.deepEqual(first.question, second.question);
  assert.equal(first.correction, null);
  assert.equal(Object.hasOwn(first, "questions"), false);
  assert.equal(Object.hasOwn(first.question!, "correct"), false);
  answer(r, "a", 1, r.questions[0].correct, 3100);
  assert.equal(view(r, "b", new Set(), 3100).selected, null);
  assert.equal(view(r, "b", new Set(), 3100).correction, null);
});
test("double taps cannot change answers or award points twice", () => {
  const r = started();
  const correct = r.questions[0].correct;
  answer(r, "a", 1, correct, 3100);
  answer(r, "a", 1, (correct + 1) % 4, 3200);
  assert.equal(r.answers.a, correct);
  answer(r, "b", 1, (correct + 1) % 4, 3200);
  assert.equal(r.phase, "reveal");
  assert.equal(r.answerTimes.a, 3100);
  assert.equal(r.players[0].score, 995);
  assert.throws(() => answer(r, "b", 1, correct, 3300));
  assert.equal(r.players[0].score, 995);
});
test("deadline, invalid input, spectators and stale round are rejected", () => {
  const r = started();
  assert.throws(() => answer(r, "a", 1, 0, r.deadline));
  assert.throws(() => answer(r, "a", 1, -1, 3100));
  assert.throws(() => answer(r, "a", 2, 0, 3100));
  assert.throws(() => answer(r, "outsider", 1, 0, 3100));
  assert.throws(() => view(r, "outsider", new Set(), 3100));
  tick(r, r.deadline);
  assert.equal(r.correction?.answers.a.choice, null);
  assert.equal(r.players[0].score, 0);
});
test("ten rounds finish once; the slower correct player earns fewer points", () => {
  const r = started();
  for (let i = 0; i < 10; i++) {
    const correct = r.questions[i].correct;
    answer(r, "a", i + 1, correct, r.deadline - 19000);
    answer(r, "b", i + 1, correct, r.deadline - 1);
    tick(r, r.deadline);
  }
  assert.equal(r.phase, "finished");
  assert.equal(r.winnerId, "a");
  assert.equal(r.players[0].score, 9500);
  assert.equal(r.players[1].score, 10);
  const revision = r.revision;
  tick(r, r.deadline + 10000);
  assert.equal(r.revision, revision);
});

test("score falls linearly; wrong and missing answers earn zero; reception time is frozen", () => {
  assert.equal(pointsForTime(0, 20000), 1000);
  assert.equal(pointsForTime(5000, 20000), 750);
  assert.equal(pointsForTime(10000, 20000), 500);
  assert.equal(pointsForTime(15000, 20000), 250);
  assert.equal(pointsForTime(19999, 20000), 1);
  assert.equal(pointsForTime(20000, 20000), 0);
  const r = started();
  answer(r, "a", 1, r.questions[0].correct, 13000);
  const restored = structuredClone(r);
  answer(restored, "a", 1, r.questions[0].correct, 22000);
  tick(restored, restored.deadline + 5000);
  assert.equal(restored.correction?.answers.a.points, 500);
  assert.equal(restored.correction?.answers.b.points, 0);
  const wrong = started();
  answer(wrong, "a", 1, (wrong.questions[0].correct + 1) % 4, 3000);
  tick(wrong, wrong.deadline);
  assert.equal(wrong.players[0].score, 0);
});

test("equal correct reception times can tie", () => {
  const r = started();
  for (let round = 1; round <= 10; round++) {
    const now = r.phaseStartedAt + 10000;
    answer(r, "a", round, r.questions[r.index].correct, now);
    answer(r, "b", round, r.questions[r.index].correct, now);
    tick(r, r.deadline);
  }
  assert.equal(r.winnerId, null);
  assert.deepEqual(
    r.players.map((p) => p.score),
    [5000, 5000],
  );
});

test("solo starts alone, refuses guests, reveals immediately and completes ten rounds", () => {
  const r = newRoom("SOLOAA", a, 0, durations, "solo");
  assert.equal(r.phase, "countdown");
  assert.throws(() => join(r, b), /solo/);
  tick(r, r.deadline);
  for (let round = 1; round <= 10; round++) {
    assert.equal(r.phase, "question");
    assert.equal(view(r, "a", new Set(["a"]), r.phaseStartedAt).mode, "solo");
    assert.equal(
      view(r, "a", new Set(), r.phaseStartedAt).phaseDuration,
      20000,
    );
    answer(
      r,
      "a",
      round,
      r.questions[r.index].correct,
      r.phaseStartedAt + 10000,
    );
    assert.equal(r.phase, "reveal");
    assert.equal(r.correction?.answers.a.points, 500);
    tick(r, r.deadline);
  }
  assert.equal(r.phase, "finished");
  assert.equal(r.reason, "completed");
  assert.equal(r.winnerId, null);
  assert.equal(r.players[0].score, 5000);
});

test("solo timeout and abandonment do not invent an opponent", () => {
  const r = newRoom("SOLOAB", a, 0, durations, "solo");
  tick(r, r.deadline);
  tick(r, r.deadline);
  assert.equal(r.correction?.answers.a.points, 0);
  leave(r, "a");
  assert.equal(r.phase, "finished");
  assert.equal(r.winnerId, null);
  assert.equal(r.reason, "forfeit");
});
test("capacity, readiness, expiry and forfeit", () => {
  const r = newRoom("ABCDEF", a, 0);
  ready(r, "a", 0);
  assert.equal(r.phase, "lobby");
  join(r, b);
  assert.equal(r.players[0].ready, false);
  assert.throws(() => join(r, { id: "c", name: "Nami" }));
  tick(r, r.deadline);
  assert.equal(r.phase, "cancelled");
  const running = started();
  leave(running, "a");
  assert.equal(running.phase, "finished");
  assert.equal(running.winnerId, "b");
  assert.equal(running.reason, "forfeit");
});
