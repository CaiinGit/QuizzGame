import { useEffect, useState } from "react";
import {
  difficultyLabels,
  type DifficultyChoice,
  type DifficultyAvailability,
} from "../shared/difficulty";
import type { Profile } from "./client";
import "./difficulty.css";

export function useDifficulties(profile: Profile | null, enabled: boolean) {
  const [options, setOptions] = useState<DifficultyAvailability | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled || !profile?.server) return;
    let disposed = false,
      fetching = false;
    const controller = new AbortController();
    setOptions(null);
    setError("");
    async function refresh() {
      if (fetching || disposed) return;
      fetching = true;
      try {
        const response = await fetch(
          `${profile!.server}/api/questions/availability`,
          {
            headers: profile!.credentials
              ? { Authorization: `Bearer ${profile!.credentials.token}` }
              : {},
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(12000),
            ]),
          },
        );
        if (!response.ok) throw new Error();
        const values: DifficultyAvailability = await response.json();
        if (!disposed) {
          setOptions(values);
          setError("");
        }
      } catch {
        if (!disposed) {
          setOptions(null);
          setError("Impossible de charger les difficultés.");
        }
      } finally {
        fetching = false;
      }
    }
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(onVisible, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [profile?.server, profile?.credentials?.token, enabled, retry]);
  return { options, error, retry: () => setRetry((v) => v + 1) };
}

export function DifficultyPicker({
  value,
  onChange,
  availability,
  disabled,
}: {
  value: DifficultyChoice;
  onChange: (value: DifficultyChoice) => void;
  availability: ReturnType<typeof useDifficulties>;
  disabled: boolean;
}) {
  return (
    <fieldset className="difficulty-picker" disabled={disabled}>
      <legend>Choisis ta difficulté</legend>
      {!availability.options ? (
        <div className="difficulty-loading" role="status">
          {availability.error || "Chargement des difficultés…"}
          {availability.error && (
            <button
              type="button"
              className="text-button"
              onClick={availability.retry}
            >
              Réessayer
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="difficulty-grid">
            {availability.options.map((option) => (
              <label
                key={option.difficulty}
                className={`difficulty-option ${!option.available ? "is-unavailable" : ""}`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={option.difficulty}
                  checked={value === option.difficulty}
                  disabled={!option.available || disabled}
                  onChange={() => onChange(option.difficulty)}
                />
                <span>
                  <strong>{difficultyLabels[option.difficulty]}</strong>
                  <small>
                    {option.available
                      ? `${option.count} questions`
                      : `${option.count} / 10 · Indisponible`}
                  </small>
                </span>
              </label>
            ))}
          </div>
          <p>10 questions publiées minimum par niveau.</p>
        </>
      )}
    </fieldset>
  );
}
