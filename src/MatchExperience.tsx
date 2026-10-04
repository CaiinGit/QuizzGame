import { Check, Clock3, LockKeyhole, X } from "lucide-react";
import type { RoomView } from "../shared/protocol";
import { themeName, type ThemeId } from "../shared/themes";

export function MatchCountdown({
  themeId,
  seconds,
  solo,
}: {
  themeId?: ThemeId;
  seconds: number;
  solo: boolean;
}) {
  const count = Math.min(3, Math.max(1, seconds));
  return (
    <section className="match-countdown" aria-label="Départ de la partie">
      <span className="eyebrow">
        {solo ? "CLASSIQUE · SOLO" : "LE DUEL COMMENCE"}
      </span>
      <div
        className="countdown-number"
        key={count}
        role="status"
        aria-live="assertive"
        aria-atomic="true"
      >
        <strong>{count}</strong>
      </div>
      <div className="countdown-steps" aria-hidden="true">
        {[3, 2, 1].map((step) => (
          <span key={step} className={step >= count ? "is-lit" : ""} />
        ))}
      </div>
      <p>10 questions · {themeName(themeId)}</p>
    </section>
  );
}

export function RoundFeedback({
  room,
  playerId,
}: {
  room: RoomView;
  playerId: string;
}) {
  const reveal = room.phase === "reveal";
  const correct =
    reveal &&
    room.selected !== null &&
    room.selected === room.correction?.correct;
  const status = reveal
    ? room.selected === null
      ? "timeout"
      : correct
        ? "right"
        : "incorrect"
    : room.submitted
      ? "locked"
      : "idle";
  const Icon =
    status === "right"
      ? Check
      : status === "incorrect"
        ? X
        : status === "timeout"
          ? Clock3
          : LockKeyhole;
  const points = room.correction?.answers[playerId]?.points ?? 0;
  return (
    <div
      className={`round-feedback ${status}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {status !== "idle" && (
        <div className="feedback-content" key={status}>
          <Icon size={22} aria-hidden="true" />
          <strong>
            {status === "locked"
              ? "Réponse enregistrée"
              : status === "right"
                ? "Bonne réponse !"
                : status === "incorrect"
                  ? "Mauvaise réponse"
                  : "Temps écoulé"}
          </strong>
          {reveal && (
            <span className="feedback-points">
              +{points.toLocaleString("fr-FR")} pts
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function ResultScoreboard({
  room,
  playerId,
}: {
  room: RoomView;
  playerId: string;
}) {
  const players = [...room.players].sort((a, b) =>
    a.id === playerId ? -1 : b.id === playerId ? 1 : 0,
  );
  return (
    <section
      className={`result-scoreboard ${room.mode === "solo" ? "is-solo" : ""}`}
      aria-label="Scores de la partie"
    >
      {players.map((player) => {
        const correct = room.history.filter(
          (round) => round.answers[player.id]?.choice === round.correct,
        ).length;
        return (
          <div
            key={player.id}
            className={`result-player ${room.winnerId === player.id ? "is-winner" : ""}`}
          >
            <span className="result-player-label">
              {room.winnerId === player.id
                ? "VAINQUEUR"
                : player.id === playerId
                  ? "TOI"
                  : "ADVERSAIRE"}
            </span>
            <strong className="result-player-name">{player.name}</strong>
            <span className="result-points">
              {player.score.toLocaleString("fr-FR")} <small>PTS</small>
            </span>
            <span className="result-accuracy">
              {correct} / {room.history.length} bonnes réponses
            </span>
          </div>
        );
      })}
    </section>
  );
}
