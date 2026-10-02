import { useEffect, useState } from "react";
import type { AccountStatistics, ModeStatistics } from "../shared/account";
import { accountApi, type Profile } from "./client";

function Summary({
  title,
  value,
  duel,
}: {
  title: string;
  value: ModeStatistics;
  duel?: boolean;
}) {
  const items: [string, string | number][] = [
    ["Parties jouées", value.played],
    ["Bonnes réponses", value.accuracy === null ? "—" : `${value.accuracy} %`],
    ...(duel
      ? ([
          ["Victoires", value.wins],
          ["Défaites", value.losses],
          ["Égalités", value.draws],
        ] as [string, number][])
      : ([
          ["Terminées", value.completed],
          ["Interrompues", value.interrupted],
        ] as [string, number][])),
  ];
  return (
    <section className="mode-statistics" aria-label={`Statistiques ${title}`}>
      <h3>{title}</h3>
      <dl>
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>
        {value.questions
          ? `${value.correct} bonnes réponses sur ${value.questions} questions corrigées.`
          : "Tes statistiques apparaîtront après tes premières parties."}
      </p>
    </section>
  );
}
export function ProfileStatistics({
  profile,
  totalXp,
}: {
  profile: Profile;
  totalXp: number;
}) {
  const [statistics, setStatistics] = useState<AccountStatistics | null>(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setError(false);
    void accountApi<AccountStatistics>(profile, "statistics")
      .then((value) => {
        if (current) setStatistics(value);
      })
      .catch(() => {
        if (current) setError(true);
      });
    return () => {
      current = false;
    };
  }, [profile.server, profile.credentials?.token, totalXp, attempt]);
  return (
    <section className="profile-statistics" aria-label="Mes statistiques">
      <h2>Mes statistiques</h2>
      {error ? (
        <>
          <p>Impossible de charger les statistiques.</p>
          <button
            className="text-button"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Réessayer
          </button>
        </>
      ) : !statistics ? (
        <p aria-live="polite">Chargement des statistiques…</p>
      ) : (
        <>
          <Summary title="Duel" value={statistics.duel} duel />
          <Summary title="Solo" value={statistics.solo} />
          <p className="statistics-note">
            Les abandons comptent dans les résultats des duels. Le taux de
            réussite porte sur les questions corrigées, y compris celles sans
            réponse.
          </p>
        </>
      )}
    </section>
  );
}
