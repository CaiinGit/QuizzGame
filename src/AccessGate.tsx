import { useEffect, useRef, useState, type ReactNode } from "react";
import { AuthDialog, type AuthMode } from "./Account";
import { accountApi, loadProfile, saveProfile, type Profile } from "./client";
import type { AccountProfile, AuthResult } from "../shared/account";

export function AccessGate({
  children,
}: {
  children: (adminOnly: boolean) => ReactNode;
}) {
  const [adminOnly, setAdminOnly] = useState(true);
  const [state, setState] = useState<"loading" | "locked" | "open" | "error">(
    "loading",
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [attempt, setAttempt] = useState(0);
  const pending = useRef<AuthResult | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function check() {
      setState("loading");
      try {
        const p = await loadProfile();
        const response = await fetch(`${p.server}/api/access`, {
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) throw new Error();
        const access = await response.json();
        if (typeof access.adminOnly !== "boolean") throw new Error();
        if (cancelled) return;
        setProfile(p);
        setAdminOnly(access.adminOnly);
        if (!access.adminOnly) {
          setState("open");
          return;
        }
        if (p.credentials?.account) {
          try {
            const a = await accountApi<AccountProfile>(p, "me");
            if (cancelled) return;
            if (a.isAdmin && !a.mustChangePassword) {
              setState("open");
              return;
            }
            if (a.isAdmin && a.mustChangePassword) {
              setMode("security");
              setState("locked");
              return;
            }
          } catch {
            /* Stay locked; a failed verification never opens the app. */
          }
        }
        if (!cancelled) {
          setMode("login");
          setState("locked");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  useEffect(() => {
    const refresh = () => setAttempt((n) => n + 1);
    window.addEventListener("akasha:access-changed", refresh);
    return () => window.removeEventListener("akasha:access-changed", refresh);
  }, []);
  if (state === "open") return children(adminOnly);
  if (state === "loading")
    return (
      <main className="loading">
        Akasha<span>Vérification de l’accès…</span>
      </main>
    );
  if (state === "error" || !profile)
    return (
      <main className="loading">
        Akasha<span>Connexion au serveur impossible.</span>
        <button
          className="button primary"
          onClick={() => setAttempt((n) => n + 1)}
        >
          Réessayer
        </button>
      </main>
    );
  return (
    <main className="private-access">
      <AuthDialog
        key={mode}
        mode={mode}
        profile={profile}
        locked
        adminOnly
        success={async (result) => {
          if (!result.profile.isAdmin)
            throw new Error(
              "Ce compte ne dispose pas de l’accès administrateur.",
            );
          const next = { ...profile, credentials: result.credentials };
          await saveProfile(next);
          pending.current = result;
          setProfile(next);
        }}
        close={() => {
          if (!pending.current) return;
          if (pending.current.profile.mustChangePassword) {
            setMode("security");
            pending.current = null;
          } else setState("open");
        }}
      />
    </main>
  );
}
