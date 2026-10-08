import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Preferences } from "@capacitor/preferences";
import { accountApi, type Profile } from "./client";
import type { AccountProfile } from "../shared/account";
import "./aka-onboarding.css";
import { AkaTour, akaSteps } from "./AkaTour";

export function AkaOnboarding({
  profile,
  account,
  enabled,
  online,
  replay,
  onCompleted,
}: {
  profile: Profile;
  account: AccountProfile | null;
  enabled: boolean;
  online: boolean;
  replay: number;
  onCompleted: (id: string) => void;
}) {
  const owner = `${profile.server}:${account?.id ?? "guest"}`;
  const key = `akasha.aka-tour.v1:${owner}`;
  const [checked, setChecked] = useState<{
    owner: string;
    seen: boolean;
  } | null>(null);
  const [activeOwner, setActiveOwner] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const handledReplay = useRef(replay);
  const finishedOwners = useRef(new Set<string>());
  const completed = useRef(onCompleted);
  useEffect(() => {
    completed.current = onCompleted;
  }, [onCompleted]);
  useEffect(() => {
    let alive = true;
    void Preferences.get({ key })
      .then(({ value }) => {
        if (alive)
          setChecked({
            owner,
            seen: value === "1" || finishedOwners.current.has(owner),
          });
      })
      .catch(() => {
        if (alive)
          setChecked({ owner, seen: finishedOwners.current.has(owner) });
      });
    return () => {
      alive = false;
    };
  }, [key, owner]);
  useEffect(() => {
    if (!enabled) return;
    const requested = replay !== handledReplay.current;
    // A portal transition owns its native modal until navigation completes.
    if (document.querySelector(".portal-entry[open]")) return;
    if (
      requested ||
      (account &&
        !account.onboardingCompleted &&
        checked?.owner === owner &&
        !checked.seen)
    ) {
      if (requested || activeOwner !== owner) {
        setStep(0);
        setActiveOwner(owner);
      }
      handledReplay.current = replay;
    }
  }, [
    enabled,
    replay,
    account?.onboardingCompleted,
    account?.id,
    checked,
    owner,
    activeOwner,
  ]);
  useEffect(() => {
    if (
      !account ||
      account.onboardingCompleted ||
      !online ||
      checked?.owner !== owner ||
      !checked.seen
    )
      return;
    let alive = true;
    void accountApi(profile, "onboarding/complete", {})
      .then(() => {
        if (alive) completed.current(account.id);
      })
      .catch(() => {}); // The local marker retries on the next connection.
    return () => {
      alive = false;
    };
  }, [
    account?.id,
    account?.onboardingCompleted,
    online,
    checked,
    owner,
    profile.server,
    profile.credentials?.token,
  ]);
  function finish() {
    finishedOwners.current.add(owner);
    setActiveOwner(null);
    setChecked({ owner, seen: true });
    void Preferences.set({ key, value: "1" }).catch(() => {});
  }
  useEffect(() => {
    if (!enabled || activeOwner !== owner) return;
    const skip = () => finish();
    window.addEventListener("akasha:skip-tour", skip);
    return () => window.removeEventListener("akasha:skip-tour", skip);
  }, [enabled, activeOwner, owner, key]);
  if (!enabled || activeOwner !== owner) return null;
  return createPortal(
    <AkaTour
      step={step}
      next={() => (step === akaSteps.length - 1 ? finish() : setStep(step + 1))}
      back={() => setStep(Math.max(0, step - 1))}
      skip={finish}
    />,
    document.body,
  );
}
