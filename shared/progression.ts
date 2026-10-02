export function progression(totalXp: number) {
  const total = Math.max(0, Math.floor(totalXp));
  let level = Math.max(
    1,
    Math.floor((-7 + Math.sqrt(49 + total / 6.25)) / 2) + 1,
  );
  const spent = (n: number) => 200 * (n - 1) + 25 * (n - 1) * (n - 2);
  while (spent(level + 1) <= total) level++;
  while (spent(level) > total) level--;
  return {
    level,
    current: total - spent(level),
    required: 200 + 50 * (level - 1),
    total,
  };
}
export type XpReward = {
  participation: number;
  correct: number;
  bonus: number;
  total: number;
  before: number;
  after: number;
  reason: "completed" | "forfeit" | "inactive";
};
