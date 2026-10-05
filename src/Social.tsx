import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Check, UserPlus, Users, X } from "lucide-react";
import type {
  SocialState,
  Invitation,
  HistoryPage,
  MatchSummary,
  FriendPhotos,
} from "../shared/account";
import type { RoomView } from "../shared/protocol";
import { accountApi, type Profile } from "./client";
import { MatchReview } from "./MatchReview";
import { themeName } from "../shared/themes";

export function InviteCard({
  invite,
  sent,
  act,
  busy,
}: {
  invite: Invitation;
  sent?: boolean;
  act: (event: string, data: unknown) => Promise<void>;
  busy: boolean;
}) {
  return (
    <article className="social-card invite-card">
      <div>
        <strong>{invite.player.name}</strong>
        <small>
          {invite.kind === "rematch"
            ? `Revanche · ${themeName(invite.themeId)}`
            : `Duel classique · ${themeName(invite.themeId)}`}
        </small>
        <span>{sent ? "Invitation envoyée" : "T’invite à jouer"}</span>
      </div>
      <div className="social-buttons">
        {!sent && (
          <button
            className="button primary"
            disabled={busy}
            onClick={() =>
              void act("invitation:respond", { id: invite.id, accept: true })
            }
          >
            Accepter
          </button>
        )}
        <button
          className="button secondary"
          disabled={busy}
          onClick={() =>
            void act("invitation:respond", { id: invite.id, accept: false })
          }
        >
          {sent ? "Annuler" : "Refuser"}
        </button>
      </div>
    </article>
  );
}
export function FriendsPanel({
  themePicker,
  photos,
  canInvite = true,
  state,
  account,
  online,
  auth,
  act,
  busy,
  now,
}: {
  themePicker?: ReactNode;
  photos: FriendPhotos;
  canInvite?: boolean;
  state: SocialState | null;
  account: boolean;
  online: boolean;
  auth: () => void;
  act: (event: string, data: unknown) => Promise<void>;
  busy: boolean;
  now: number;
}) {
  const [username, setUsername] = useState(""),
    [remove, setRemove] = useState<string | null>(null);
  if (!account)
    return (
      <section className="social-empty">
        <Users size={36} />
        <p>Connecte-toi pour ajouter tes amis et les inviter à jouer.</p>
        <button className="button primary" onClick={auth}>
          Me connecter ou créer un compte
        </button>
      </section>
    );
  if (!online || !state)
    return (
      <p className="muted" role="status">
        {online ? "Chargement de tes amis…" : "Reconnexion au serveur…"}
      </p>
    );
  return (
    <div className="social-panel">
      <form
        className="account-form"
        onSubmit={(e) => {
          e.preventDefault();
          void act("friends:request", { username });
        }}
      >
        <label htmlFor="friend-username">
          Ajouter un ami par son pseudo unique
        </label>
        <div className="compact-form">
          <input
            id="friend-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoComplete="off"
            placeholder="Pseudo de ton ami"
            minLength={3}
            maxLength={20}
            required
          />
          <button className="button primary" disabled={busy}>
            <UserPlus size={18} />
            Ajouter
          </button>
        </div>
      </form>
      {!!state.invitations.filter((i) => i.expiresAt > now).length && (
        <section>
          <h2>Invitations à jouer</h2>
          {state.invitations
            .filter((i) => i.expiresAt > now)
            .map((i) => (
              <InviteCard key={i.id} invite={i} act={act} busy={busy} />
            ))}
        </section>
      )}
      {!!state.sentInvitations.filter((i) => i.expiresAt > now).length && (
        <section>
          <h2>Invitations envoyées</h2>
          {state.sentInvitations
            .filter((i) => i.expiresAt > now)
            .map((i) => (
              <InviteCard key={i.id} invite={i} sent act={act} busy={busy} />
            ))}
        </section>
      )}
      {!!state.incoming.length && (
        <section>
          <h2>Demandes reçues</h2>
          {state.incoming.map((r) => (
            <article key={r.id} className="social-card">
              <div>
                <strong>{r.player.name}</strong>
                <small>@{r.player.username}</small>
              </div>
              <div className="social-buttons">
                <button
                  className="icon-button"
                  aria-label={`Accepter ${r.player.username}`}
                  disabled={busy}
                  onClick={() =>
                    void act("friends:respond", { id: r.id, accept: true })
                  }
                >
                  <Check />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Refuser ${r.player.username}`}
                  disabled={busy}
                  onClick={() =>
                    void act("friends:respond", { id: r.id, accept: false })
                  }
                >
                  <X />
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      {!!state.outgoing.length && (
        <section>
          <h2>Demandes envoyées</h2>
          {state.outgoing.map((r) => (
            <article key={r.id} className="social-card">
              <div>
                <strong>{r.player.name}</strong>
                <small>@{r.player.username} · En attente</small>
              </div>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  void act("friends:respond", { id: r.id, accept: false })
                }
              >
                Annuler
              </button>
            </article>
          ))}
        </section>
      )}
      <section>
        <h2>
          Mes amis <small>{state.friends.length}</small>
        </h2>
        {!state.friends.length ? (
          <p className="muted">
            Ta liste est encore vide. Ajoute ton premier ami avec son pseudo.
          </p>
        ) : (
          <>
            {themePicker}
            {state.friends.map((f) => (
              <article key={f.id} className="social-card friend-card">
                <div className="friend-initial">
                  {photos[f.id] ? (
                    <img src={photos[f.id]!} alt={`Photo de ${f.name}`} />
                  ) : (
                    <span aria-hidden="true">{f.name[0].toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <strong>{f.name}</strong>
                  <small>@{f.username}</small>
                  <span
                    className={`friend-presence ${f.online ? "is-online" : ""} is-${f.presence}`}
                  >
                    {f.presence === "lobby"
                      ? "Dans un salon"
                      : f.presence === "playing"
                        ? "En partie"
                        : f.online
                          ? "En ligne"
                          : "Hors ligne"}
                    {!f.online &&
                    (f.presence === "lobby" || f.presence === "playing")
                      ? " · déconnecté"
                      : ""}
                  </span>
                </div>
                <div className="social-buttons">
                  <button
                    className="button primary"
                    disabled={
                      busy ||
                      !canInvite ||
                      f.presence === "lobby" ||
                      f.presence === "playing" ||
                      state.sentInvitations.some(
                        (i) => i.player.id === f.id && i.expiresAt > now,
                      )
                    }
                    onClick={() => void act("friends:invite", { id: f.id })}
                  >
                    {f.presence === "lobby" || f.presence === "playing"
                      ? "Occupé"
                      : state.sentInvitations.some(
                            (i) => i.player.id === f.id && i.expiresAt > now,
                          )
                        ? "Invité"
                        : "Inviter"}
                  </button>
                  <button
                    className="text-button"
                    aria-label={`Retirer ${f.username}`}
                    onClick={() => setRemove(remove === f.id ? null : f.id)}
                  >
                    Retirer
                  </button>
                </div>
                {remove === f.id && (
                  <div className="inline-confirm">
                    <p>Retirer {f.name} de tes amis ?</p>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        void act("friends:remove", { id: f.id }).then(() =>
                          setRemove(null),
                        )
                      }
                    >
                      Confirmer
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setRemove(null)}
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </article>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
export function HistoryPanel({
  profile,
  auth,
}: {
  profile: Profile;
  auth: () => void;
}) {
  const [matches, setMatches] = useState<MatchSummary[]>([]),
    [next, setNext] = useState<number | null>(0),
    [detail, setDetail] = useState<RoomView | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const id = profile.credentials?.id ?? "";
  async function load(offset: number) {
    setBusy(true);
    setError("");
    try {
      const result = await accountApi<HistoryPage>(
        profile,
        `history?offset=${offset}`,
      );
      setMatches((old) =>
        offset === 0 ? result.matches : [...old, ...result.matches],
      );
      setNext(result.next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (profile.credentials?.account) void load(0);
    else setBusy(false);
  }, [id]);
  if (!profile.credentials?.account)
    return (
      <div className="social-empty">
        <p>Connecte-toi pour retrouver tes parties sur tous tes appareils.</p>
        <button className="button primary" onClick={auth}>
          Me connecter ou créer un compte
        </button>
      </div>
    );
  if (detail)
    return (
      <section className="history-detail">
        <button className="text-button" onClick={() => setDetail(null)}>
          <ArrowLeft size={18} />
          Toutes mes parties
        </button>
        <h2>
          {detail.mode === "solo" ? "Solo" : "Duel"} ·{" "}
          {themeName(detail.themeId)}
        </h2>
        <MatchReview room={detail} playerId={id} />
        {!detail.history.length && (
          <p className="muted">Aucune question corrigée dans cette partie.</p>
        )}
      </section>
    );
  return (
    <div className="history-panel">
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button className="text-button" onClick={() => void load(0)}>
            Réessayer
          </button>
        </div>
      )}
      {!busy && !matches.length && !error && (
        <p className="muted">
          Tes prochaines parties terminées apparaîtront ici.
        </p>
      )}
      {matches.map((m) => {
        const me = m.players.find((p) => p.id === id)!,
          other = m.players.find((p) => p.id !== id);
        const result =
          m.mode === "solo"
            ? "Solo"
            : m.winnerId === id
              ? "Victoire"
              : m.winnerId
                ? "Défaite"
                : "Égalité";
        return (
          <button
            key={m.id}
            className="history-card"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError("");
              void accountApi<RoomView>(
                profile,
                `history/${encodeURIComponent(m.id)}`,
              )
                .then(setDetail)
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
          >
            <span>
              <strong>{result}</strong>
              <small>
                {themeName(m.themeId)}
                {other ? ` · contre ${other.name}` : ""}
              </small>
              <time>
                {new Date(m.finishedAt).toLocaleString("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </time>
            </span>
            <span className="history-score">
              <b>{me.score.toLocaleString("fr-FR")}</b>
              {other && <small>— {other.score.toLocaleString("fr-FR")}</small>}
              <small>
                {m.rounds} questions corrigées
                {m.reason === "forfeit" ? " · Abandon" : ""}
              </small>
            </span>
          </button>
        );
      })}
      {busy && (
        <p role="status" className="muted">
          Chargement…
        </p>
      )}
      {next !== null && !busy && !!matches.length && (
        <button className="button secondary" onClick={() => void load(next)}>
          Voir les parties précédentes
        </button>
      )}
    </div>
  );
}
