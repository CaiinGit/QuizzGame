import type { Room } from "./engine";
import type { XpReward } from "../shared/progression";

export function rewards(room: Room) {
  if (room.phase !== "finished" || room.xpVersion !== 1) return [];
  return room.players.map((player) => {
    const answered = room.history.some(
      (r) => r.answers[player.id]?.choice != null,
    );
    const forfeited = room.forfeitedBy === player.id;
    const eligible = answered && !forfeited;
    const completed = room.reason === "completed";
    const correct = eligible
      ? 10 *
        room.history.filter((r) => r.answers[player.id]?.choice === r.correct)
          .length
      : 0;
    const participation = eligible
      ? completed
        ? 30
        : 3 * room.history.length
      : 0;
    const bonus =
      eligible && completed && room.mode === "duel"
        ? room.winnerId === player.id
          ? 30
          : room.winnerId === null
            ? 15
            : 0
        : 0;
    return {
      id: player.id,
      reward: {
        participation,
        correct,
        bonus,
        total: participation + correct + bonus,
        reason: forfeited
          ? "forfeit"
          : !answered
            ? "inactive"
            : completed
              ? "completed"
              : "forfeit",
      } satisfies Omit<XpReward, "before" | "after">,
    };
  });
}
