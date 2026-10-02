import { useState } from "react";
import { Copy, History, LogOut, Shield, Users, X } from "lucide-react";
import { accountApi, type Profile } from "./client";
import type { AccountProfile, AuthResult } from "../shared/account";

export type AuthMode = "register" | "login" | "recover" | "security";
export function AuthDialog({
  mode: initial,
  profile,
  close,
  success,
}: {
  mode: AuthMode;
  profile: Profile;
  close: () => void;
  success: (result: AuthResult, mode: AuthMode) => Promise<void>;
}) {
  const [mode, setMode] = useState(initial),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [code, setCode] = useState(""),
    [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [recovery, setRecovery] = useState<string | null>(null),
    [copied, setCopied] = useState(false);
  const title =
    mode === "register"
      ? "Créer mon compte"
      : mode === "login"
        ? "Me connecter"
        : mode === "recover"
          ? "Récupérer mon compte"
          : "Sécurité du compte";
  async function submit() {
    if (busy) return;
    if (mode !== "login" && password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await accountApi<AuthResult>(profile, mode, {
        username,
        password,
        code,
        currentPassword: current,
      });
      if (result.recoveryCode) setRecovery(result.recoveryCode);
      await success(result, mode);
      if (!result.recoveryCode) close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal account-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        data-recovery={recovery ? "true" : undefined}
        data-busy={busy ? "true" : undefined}
      >
        {!recovery && (
          <button
            className="icon-button close"
            aria-label="Fermer le compte"
            disabled={busy}
            onClick={close}
          >
            <X />
          </button>
        )}
        <span className="eyebrow">TON ESCALE AKASHA</span>
        <h2 id="account-title">{recovery ? "Ton code de secours" : title}</h2>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        {recovery ? (
          <>
            <p>
              Conserve ce code dans un endroit sûr. Il permet de récupérer ton
              compte si tu oublies ton mot de passe. Il ne sera affiché qu’ici ;
              il remplace tout ancien code.
            </p>
            <output className="recovery-code" aria-label="Code de secours">
              {recovery}
            </output>
            <button
              className="button secondary"
              onClick={() =>
                void navigator.clipboard
                  .writeText(recovery)
                  .then(() => setCopied(true))
                  .catch(() =>
                    setError(
                      "Sélectionne le code pour le copier manuellement.",
                    ),
                  )
              }
            >
              <Copy size={18} />
              {copied ? "Code copié" : "Copier mon code"}
            </button>
            <button className="button primary" disabled={busy} onClick={close}>
              J’ai conservé mon code
            </button>
          </>
        ) : (
          <>
            {mode === "register" && (
              <p>
                Retrouve ton profil, tes amis et tes parties sur téléphone et
                PC.
                {profile.credentials && !profile.credentials.account
                  ? " Ton profil de test sera rattaché à ce compte."
                  : ""}
              </p>
            )}
            <form
              className="account-form"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {mode !== "security" && (
                <>
                  <label htmlFor="account-username">Pseudo unique</label>
                  <input
                    id="account-username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    minLength={3}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_]{3,20}"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={busy}
                  />
                  <small>
                    3 à 20 lettres sans accents, chiffres ou underscores.
                  </small>
                </>
              )}
              {mode === "recover" && (
                <>
                  <label htmlFor="recovery-input">Code de secours</label>
                  <input
                    id="recovery-input"
                    autoComplete="off"
                    required
                    maxLength={100}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={busy}
                  />
                </>
              )}
              {mode === "security" && (
                <>
                  <label htmlFor="current-password">Mot de passe actuel</label>
                  <input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={128}
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    disabled={busy}
                  />
                </>
              )}
              <label htmlFor="account-password">
                {mode === "recover" || mode === "security"
                  ? "Nouveau mot de passe"
                  : "Mot de passe"}
              </label>
              <input
                id="account-password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={mode === "login" ? 1 : 15}
                maxLength={128}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
              {mode !== "login" && (
                <>
                  <small>
                    15 caractères minimum. Tu peux utiliser une phrase.
                  </small>
                  <label htmlFor="confirm-password">
                    Confirmer le mot de passe
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={15}
                    maxLength={128}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={busy}
                  />
                </>
              )}
              <button className="button primary" disabled={busy}>
                {busy
                  ? "Connexion…"
                  : mode === "security"
                    ? "Changer le mot de passe"
                    : title}
              </button>
            </form>
            {mode !== "security" && (
              <div className="account-links">
                {(["register", "login", "recover"] as const)
                  .filter((m) => m !== mode)
                  .map((m) => (
                    <button
                      key={m}
                      className="text-button"
                      disabled={busy}
                      onClick={() => {
                        setMode(m);
                        setError("");
                        setPassword("");
                        setConfirm("");
                      }}
                    >
                      {m === "register"
                        ? "Créer un compte"
                        : m === "login"
                          ? "J’ai déjà un compte"
                          : "Mot de passe oublié ?"}
                    </button>
                  ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export function AccountActions({
  profile,
  account,
  auth,
  history,
  friends,
  logout,
  updated,
}: {
  profile: Profile | null;
  account: AccountProfile | null;
  auth: (mode: AuthMode) => void;
  history: () => void;
  friends: () => void;
  logout: () => Promise<void>;
  updated: (value: AccountProfile) => void;
}) {
  const [name, setName] = useState(account?.name ?? ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmLogout, setConfirmLogout] = useState(false);
  async function save() {
    if (!profile) return;
    setBusy(true);
    setError("");
    try {
      updated(await accountApi<AccountProfile>(profile, "profile", { name }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!profile?.credentials?.account)
    return (
      <div className="account-actions">
        <p className="muted">
          Crée ton compte pour retrouver tes parties et tes amis sur tous tes
          appareils.
        </p>
        <button className="button primary" onClick={() => auth("register")}>
          Créer un compte
        </button>
        <button className="button secondary" onClick={() => auth("login")}>
          Me connecter
        </button>
      </div>
    );
  if (!account)
    return (
      <p role="status" className="muted">
        Chargement de ton compte…
      </p>
    );
  return (
    <section className="account-actions" aria-label="Mon compte">
      <p className="account-handle">@{account.username}</p>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <form
        className="account-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label htmlFor="display-name">Nom affiché</label>
        <div className="compact-form">
          <input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={20}
            required
          />
          <button
            className="button secondary"
            disabled={busy || name === account.name}
          >
            Enregistrer
          </button>
        </div>
      </form>
      <button className="button secondary" onClick={history}>
        <History size={20} />
        Mes parties
      </button>
      <button className="button secondary" onClick={friends}>
        <Users size={20} />
        Mes amis
      </button>
      <button className="button secondary" onClick={() => auth("security")}>
        <Shield size={20} />
        Mot de passe et code de secours
      </button>
      {confirmLogout ? (
        <div className="inline-confirm">
          <p>Déconnecter cet appareil ? Ton compte reste sauvegardé.</p>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void logout().catch((e) => {
                setError(e.message);
                setBusy(false);
              });
            }}
          >
            Confirmer la déconnexion
          </button>
          <button
            className="text-button"
            onClick={() => setConfirmLogout(false)}
          >
            Annuler
          </button>
        </div>
      ) : (
        <button className="text-button" onClick={() => setConfirmLogout(true)}>
          <LogOut size={17} />
          Me déconnecter
        </button>
      )}
    </section>
  );
}
