import { Check, Minus, X } from "lucide-react";
import type { RoomView } from "../shared/protocol";

export function MatchReview({
  room,
  playerId,
}: {
  room: RoomView;
  playerId: string;
}) {
  const history = room.history ?? [];
  if (!history.length) return null;
  const players = [...room.players].sort((a, b) =>
    a.id === playerId ? -1 : b.id === playerId ? 1 : 0,
  );
  return (
    <section className="match-review" aria-labelledby="review-title">
      <h2 id="review-title">Détail des réponses</h2>
      <div className="review-totals">
        {players.map((player) => (
          <div key={player.id}>
            <strong>
              {player.name}
              {player.id === playerId ? " · Toi" : ""}
            </strong>
            <span>
              {
                history.filter(
                  (r) => r.answers[player.id]?.choice === r.correct,
                ).length
              }{" "}
              / {history.length} bonnes réponses
            </span>
          </div>
        ))}
      </div>
      {history.length < room.total && (
        <p className="review-note">
          Bilan des {history.length} questions corrigées sur {room.total}.
        </p>
      )}
      <ol className="review-list">
        {history.map((round) => (
          <li key={round.round}>
            <details className="review-round">
              <summary>
                <span className="review-number">
                  QUESTION {String(round.round).padStart(2, "0")}
                </span>
                <strong className="review-question">{round.question}</strong>
                <span className="review-players">
                  {players.map((player) => {
                    const answer = round.answers[player.id];
                    const missing = answer?.choice == null;
                    const correct = !missing && answer.choice === round.correct;
                    return (
                      <span
                        key={player.id}
                        className={`review-answer ${missing ? "unanswered" : correct ? "right" : "incorrect"}`}
                      >
                        <span className="review-player-name">
                          {player.name}
                        </span>
                        <span className="review-outcome">
                          {missing ? (
                            <Minus size={16} aria-hidden="true" />
                          ) : correct ? (
                            <Check size={16} aria-hidden="true" />
                          ) : (
                            <X size={16} aria-hidden="true" />
                          )}
                          {missing
                            ? "Sans réponse"
                            : correct
                              ? "Juste"
                              : "Faux"}
                        </span>
                        <span>
                          +{(answer?.points ?? 0).toLocaleString("fr-FR")} pts
                        </span>
                      </span>
                    );
                  })}
                </span>
                <span className="review-toggle">Voir les réponses</span>
              </summary>
              <div className="review-detail">
                <p>
                  <strong>Bonne réponse :</strong>{" "}
                  {round.choices[round.correct]}
                </p>
                {players.map((player) => {
                  const choice = round.answers[player.id]?.choice;
                  return (
                    <p key={player.id}>
                      <strong>{player.name} :</strong>{" "}
                      {choice == null
                        ? "Aucune réponse"
                        : round.choices[choice]}
                    </p>
                  );
                })}
              </div>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
