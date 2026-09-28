export const MAX_QUESTION_POINTS = 1000;

/** A correct answer loses points linearly; a response at the deadline is too late. */
export function pointsForTime(elapsed: number, duration: number): number {
  if (duration <= 0 || elapsed >= duration) return 0;
  return Math.ceil(
    (MAX_QUESTION_POINTS * (duration - Math.max(0, elapsed))) / duration,
  );
}
