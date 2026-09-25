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
  assert.equal(r.players[0].score, 1000);
  assert.throws(() => answer(r, "b", 1, correct, 3300));
  assert.equal(r.players[0].score, 1000);
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
test("ten rounds finish once, with a tied score and no speed bonus", () => {
  const r = started();
  for (let i = 0; i < 10; i++) {
    const correct = r.questions[i].correct;
    answer(r, "a", i + 1, correct, r.deadline - 19000);
    answer(r, "b", i + 1, correct, r.deadline - 1);
    tick(r, r.deadline);
  }
  assert.equal(r.phase, "finished");
  assert.equal(r.winnerId, null);
  assert.equal(r.players[0].score, 10000);
  assert.equal(r.players[1].score, 10000);
  const revision = r.revision;
  tick(r, r.deadline + 10000);
  assert.equal(r.revision, revision);
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
