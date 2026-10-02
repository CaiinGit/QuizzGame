import { useEffect, useState } from "react";
import { progression, type XpReward } from "../shared/progression";
import { accountApi, type Profile } from "./client";
import "./progression.css";

export function LevelProgress({ total }: { total: number }) {
  const p = progression(total);
  return (
    <div className="xp-progress">
      <strong>Niveau {p.level}</strong>
      <div
        className="xp-track"
        role="progressbar"
        aria-label={`Progression vers le niveau ${p.level + 1}`}
        aria-valuemin={0}
        aria-valuemax={p.required}
        aria-valuenow={p.current}
      >
        <span style={{ width: `${(100 * p.current) / p.required}%` }} />
      </div>
      <span>
        {p.current} / {p.required} XP
      </span>
    </div>
  );
}
export function XpResult({
  profile,
  matchId,
}: {
  profile: Profile;
  matchId: string;
}) {
  const [reward, setReward] = useState<XpReward | null>(null);
  const [total, setTotal] = useState(0),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(false);
    void accountApi<XpReward | null>(
      profile,
      `reward/${encodeURIComponent(matchId)}`,
    )
      .then((r) => {
        if (alive) {
          setReward(r);
          if (r) setTotal(r.before);
        }
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [profile.server, profile.credentials?.token, matchId, attempt]);
  useEffect(() => {
    if (!reward) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTotal(reward.after);
      return;
    }
    const start = performance.now();
    let frame: number;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / 1500);
      setTotal(Math.round(reward.before + reward.total * progress));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [reward]);
  if (error)
    return (
      <div className="xp-result">
        <p>La progression est momentanément indisponible.</p>
        <button
          className="text-button"
          onClick={() => setAttempt((n) => n + 1)}
        >
          Réessayer
        </button>
      </div>
    );
  if (!reward) return null;
  const before = progression(reward.before),
    after = progression(total);
  return (
    <section className="xp-result" aria-label="Expérience gagnée">
      <span className="eyebrow">EXPÉRIENCE</span>
      <h2>+{reward.total} XP</h2>
      <dl>
        <div>
          <dt>Participation</dt>
          <dd>+{reward.participation}</dd>
        </div>
        <div>
          <dt>Bonnes réponses</dt>
          <dd>+{reward.correct}</dd>
        </div>
        {reward.bonus > 0 && (
          <div>
            <dt>{reward.bonus === 15 ? "Égalité" : "Victoire"}</dt>
            <dd>+{reward.bonus}</dd>
          </div>
        )}
      </dl>
      {reward.reason === "forfeit" && (
        <p>
          {reward.total
            ? "Partie interrompue : les manches corrigées comptent, sans bonus de victoire."
            : "Aucune XP après un abandon."}
        </p>
      )}
      {reward.reason === "inactive" && (
        <p>Aucune XP sans réponse pendant la partie.</p>
      )}
      <LevelProgress total={total} />
      {after.level > before.level && (
        <p className="level-up" role="status">
          Niveau {after.level} atteint !
        </p>
      )}
    </section>
  );
}
