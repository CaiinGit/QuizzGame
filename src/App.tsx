import { useEffect, useRef, useState } from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Copy,
  RotateCcw,
  Trophy,
  Wifi,
  X,
} from "lucide-react";
import {
  command,
  connect,
  createSession,
  loadProfile,
  saveProfile,
  serverUrl,
  type DuelSocket,
  type Profile,
  accountApi,
} from "./client";
import { Explore, BottomNavigation } from "./Explore";
import { useNavigation } from "./navigation";
import { ThemeToggle } from "./ThemeToggle";
import {
  PlayerHeader,
  PhotoEditor,
  headerPanels,
  type HeaderPanel,
} from "./PlayerHeader";
import { useAvatar, preparePhoto } from "./avatar";
import { AccountActions, AuthDialog, type AuthMode } from "./Account";
import { FriendsPanel, HistoryPanel, InviteCard } from "./Social";
import type {
  AccountProfile,
  AuthResult,
  SocialState,
} from "../shared/account";
import { TimeBar } from "./TimeBar";
import { MatchReview } from "./MatchReview";
import {
  MatchCountdown,
  RoundFeedback,
  ResultScoreboard,
} from "./MatchExperience";
import { AccessGate } from "./AccessGate";
import { LevelProgress, XpResult } from "./Progression";
type Intent =
  | { event: "room:create"; data: { mode?: "duel" | "solo" } }
  | { event: "room:join"; data: { code: string } };
import type { RoomView } from "../shared/protocol";

export default function Root() {
  return (
    <AccessGate>{(adminOnly) => <App adminOnly={adminOnly} />}</AccessGate>
  );
}
function App({ adminOnly }: { adminOnly: boolean }) {
  const navigation = useNavigation();
  const avatar = useAvatar();
  const [account, setAccount] = useState<AccountProfile | null>(null),
    [auth, setAuth] = useState<AuthMode | null>(null),
    [social, setSocial] = useState<SocialState | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false),
    [photoError, setPhotoError] = useState("");
  const [headerPanel, setHeaderPanel] = useState<HeaderPanel | null>(null);
  const [identity, setIdentity] = useState(false),
    [intent, setIntent] = useState<Intent | null>(null),
    [synced, setSynced] = useState(false);
  const backRef = useRef(() => {});
  backRef.current = () => {
    if (auth) {
      if (
        !document.querySelector(
          '.account-dialog[data-recovery="true"],.account-dialog[data-busy="true"]',
        )
      )
        setAuth(null);
    } else if (identity) {
      setIdentity(false);
      setIntent(null);
    } else if (headerPanel) setHeaderPanel(null);
    else if (settings) setSettings(false);
    else if (quitting) setQuitting(false);
    else if (room) setQuitting(true);
    else if (navigation.screen !== "accueil") navigation.back();
    else void NativeApp.minimizeApp();
  };
  function navigate(screen: Parameters<typeof navigation.navigate>[0]) {
    setIntent(null);
    setError("");
    navigation.navigate(screen);
  }
  function requestAction(action: Intent) {
    setError("");
    setIntent(action);
    if (!profile?.credentials) setIdentity(true);
    else if (!online)
      setError(
        "Connexion en cours. Le salon s’ouvrira dès que le serveur sera disponible.",
      );
  }

  const [profile, setProfile] = useState<Profile | null>(null),
    [room, setRoom] = useState<RoomView | null>(null);
  const [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [online, setOnline] = useState(false),
    [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [settings, setSettings] = useState(false),
    [address, setAddress] = useState("");
  const [quitting, setQuitting] = useState(false),
    [copied, setCopied] = useState(false),
    [now, setNow] = useState(Date.now());
  const socket = useRef<DuelSocket | null>(null),
    offset = useRef(0),
    clockSynced = useRef(false),
    pending = useRef(false);
  useEffect(() => {
    if (adminOnly && !loading && profile && !profile.credentials && !auth)
      window.dispatchEvent(new Event("akasha:access-changed"));
  }, [adminOnly, loading, profile?.credentials?.token, auth]);
  useEffect(() => {
    setIntent(null);
    setIdentity(false);
    setError("");
  }, [navigation.screen]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [
    room?.code,
    room?.round,
    room?.phase === "finished",
    room?.phase === "cancelled",
  ]);
  useEffect(() => {
    let mounted = true;
    loadProfile()
      .then((p) => {
        if (mounted) {
          setProfile(p);
          setName(p.credentials?.name ?? "");
          setAddress(p.server);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Impossible de charger le profil. Relance l’application.");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!profile?.credentials) return;
    setSynced(false);
    clockSynced.current = false;
    const s = connect(profile);
    socket.current = s;
    let disposed = false;
    const sync = async () => {
      const sent = Date.now();
      try {
        const result = await command<{ serverNow: number }>(s, "sync");
        offset.current = result.serverNow - (sent + Date.now()) / 2;
        clockSynced.current = true;
      } catch {
        /* Automatic reconnect will retry. */
      }
    };
    s.on("connect", () => {
      setOnline(true);
      setError("");
      void sync();
      if (profile.credentials?.account)
        void accountApi<AccountProfile>(profile, "me")
          .then((p) => {
            if (!disposed) updateAccount(p);
          })
          .catch((e) => {
            if (!disposed) setError(e.message);
          });
    });
    const expired = () => {
      if (disposed) return;
      setProfile((p) =>
        p && p.credentials?.token === profile.credentials?.token
          ? { ...p, credentials: null }
          : p,
      );
      setAccount(null);
      setSocial(null);
      setRoom(null);
      setError("Ta session a expiré. Reconnecte-toi à ton compte.");
      void loadProfile().then((p) => {
        if (p.credentials?.token === profile.credentials?.token)
          return saveProfile({ ...p, credentials: null });
      });
    };
    s.on("auth:expired", expired);
    s.on("account:profile", (p: AccountProfile) => {
      if (!disposed) updateAccount(p);
    });
    s.on("social:state", (state: SocialState) => {
      if (!disposed) setSocial(state);
    });
    s.on("disconnect", () => {
      setOnline(false);
      setSynced(false);
    });
    s.on("connect_error", (e) => {
      setOnline(false);
      if (e.message === "SESSION_EXPIRED") {
        if (profile.credentials?.account) {
          expired();
          return;
        }
        const next = { ...profile, credentials: null };
        void saveProfile(next).then(() => {
          if (!disposed) {
            setProfile(next);
            setRoom(null);
            setError(
              "Ton profil de test a expiré. Choisis ton pseudo pour revenir.",
            );
          }
        });
      } else
        setError(
          "Serveur injoignable. Vérifie ta connexion ou l’adresse dans les réglages.",
        );
    });
    s.on("room:state", (state: RoomView | null) => {
      // State packets must not reset the clock on every opponent answer.
      if (state && !clockSynced.current)
        offset.current = state.serverNow - Date.now();
      setRoom(state);
      setSynced(true);
      if (state) setIntent(null);
    });
    s.connect();
    const timer = setInterval(() => void sync(), 15000);
    const visibility = () => {
      if (document.visibilityState === "visible") {
        if (s.connected) void sync();
        else s.connect();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      s.removeAllListeners();
      s.disconnect();
      socket.current = null;
      setOnline(false);
    };
  }, [profile?.server, profile?.credentials?.token]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset.current), 100);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = NativeApp.addListener("backButton", () => {
      backRef.current();
    });
    return () => {
      void listener.then((l) => l.remove());
    };
  }, []);
  useEffect(() => {
    if (
      !intent ||
      !profile?.credentials ||
      !online ||
      !synced ||
      busy ||
      room ||
      auth
    )
      return;
    setIntent(null);
    void run(async () => {
      await command(socket.current, intent.event, intent.data);
    });
  }, [intent, profile, online, synced, busy, room, auth]);
  useEffect(() => {
    if (!identity && !settings && !quitting && !headerPanel && !auth) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled):not([hidden]),summary,[tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
    if (dialog && !dialog.contains(document.activeElement))
      focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        backRef.current();
      } else if (event.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [identity, settings, quitting, headerPanel, auth]);
  function updateAccount(value: AccountProfile) {
    setAccount(value);
    setName(value.name);
    setProfile((p) =>
      p?.credentials?.id === value.id
        ? { ...p, credentials: { ...p.credentials, name: value.name } }
        : p,
    );
  }
  async function authenticated(result: AuthResult, mode: AuthMode) {
    if (!profile) return;
    const next = {
      server: serverUrl(profile.server),
      credentials: result.credentials,
    };
    await saveProfile(next);
    setProfile(next);
    setAccount(result.profile);
    setSocial(null);
    setRoom(null);
    setName(result.profile.name);
    setError("");
    if (mode === "register" && avatar.photo) {
      try {
        updateAccount(
          await accountApi<AccountProfile>(next, "profile", {
            photo: avatar.photo,
          }),
        );
      } catch {
        setPhotoError(
          "Compte créé. Choisis à nouveau ta photo pour la synchroniser.",
        );
      }
    }
  }
  async function logout() {
    if (!profile) return;
    await accountApi(profile, "logout", {});
    const next = { ...profile, credentials: null };
    await saveProfile(next);
    setProfile(next);
    setAccount(null);
    setSocial(null);
    setRoom(null);
    setError("");
    setName("");
  }
  const displayedPhoto = profile?.credentials?.account
    ? (account?.photo ?? null)
    : avatar.photo;
  const cloudAvatar = {
    photo: displayedPhoto,
    ready: !!account,
    busy: photoBusy,
    error: photoError,
    update: async (file: File | null) => {
      if (!profile || photoBusy) return;
      setPhotoBusy(true);
      setPhotoError("");
      try {
        const photo = file ? await preparePhoto(file) : null;
        updateAccount(
          await accountApi<AccountProfile>(profile, "profile", { photo }),
        );
      } catch (e) {
        setPhotoError((e as Error).message);
      } finally {
        setPhotoBusy(false);
      }
    },
  };
  async function socialAction(event: string, data: unknown = {}) {
    await run(async () => {
      await command(socket.current, event, data);
    });
  }
  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Une erreur est survenue. Réessaie.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function enter() {
    await run(async () => {
      if (!profile?.server) {
        setIdentity(false);
        setSettings(true);
        setIntent(null);
        throw new Error("Renseigne l’adresse du serveur pour continuer.");
      }
      const server = serverUrl(profile.server);
      const credentials = await createSession(server, name.trim());
      const next = { server, credentials };
      await saveProfile(next);
      setProfile(next);
      setIdentity(false);
    });
  }
  async function changeServer() {
    setIntent(null);
    await run(async () => {
      const server = serverUrl(address);
      const next = {
        server,
        credentials: server === profile?.server ? profile.credentials : null,
      };
      await saveProfile(next);
      setProfile(next);
      setAccount(null);
      setSocial(null);
      setRoom(null);
      setSettings(false);
    });
  }
  async function leave() {
    await run(async () => {
      await command(socket.current, "room:leave");
      setQuitting(false);
      navigate("accueil");
    });
  }
  const me = room?.players.find((p) => p.id === profile?.credentials?.id),
    opponent = room?.players.find((p) => p.id !== profile?.credentials?.id);
  const seconds = room
    ? Math.max(0, Math.ceil((room.deadline - now) / 1000))
    : 0;
  const ended = room?.phase === "finished" || room?.phase === "cancelled";
  const isQuestion = room?.phase === "question" || room?.phase === "reveal";
  const solo = room?.mode === "solo";
  const rematchAvailable =
    room?.phase === "finished" &&
    !solo &&
    !!profile?.credentials?.account &&
    !!opponent?.account;
  const isOpponentRematch = (
    i: NonNullable<SocialState>["invitations"][number],
  ) =>
    rematchAvailable &&
    i.kind === "rematch" &&
    i.player.id === opponent?.id &&
    i.expiresAt > now;
  const incomingRematch = social?.invitations.find(isOpponentRematch);
  const sentRematch = social?.sentInvitations.find(isOpponentRematch);
  const result = solo
    ? room?.reason === "forfeit"
      ? "Partie interrompue"
      : "Partie terminée"
    : room?.phase === "cancelled"
      ? "Salon fermé"
      : room?.winnerId === me?.id
        ? "Victoire !"
        : room?.winnerId
          ? "Bien joué !"
          : "Égalité parfaite";
  if (loading)
    return (
      <main className="loading">
        Akasha<span>Préparation de ton escale…</span>
      </main>
    );
  return (
    <div
      className={`app-shell ${room ? "in-duel" : "has-navigation"} ${!room && navigation.screen === "accueil" ? "on-home" : ""}`}
    >
      <PlayerHeader
        totalXp={account?.totalXp}
        photo={displayedPhoto}
        profile={() => navigate("profil")}
        profileDisabled={!!room}
        open={setHeaderPanel}
        settings={() => {
          setIntent(null);
          setAddress(profile?.server ?? "");
          setSettings(true);
        }}
      />
      <main>
        {error && !settings && !quitting && !identity && !auth && (
          <div className="notice error" role="alert">
            {error}
            <button
              className="icon-button"
              aria-label="Fermer le message"
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {room && !online && (
          <div className="notice" role="status">
            <Wifi size={18} /> Reconnexion en cours… La partie continue sur le
            serveur.
          </div>
        )}
        {!!social?.invitations.length &&
          (!!room || navigation.screen !== "amis") &&
          (!room || ended || room.phase === "lobby") && (
            <div className="invitation-inbox" aria-label="Invitations reçues">
              {social.invitations
                .filter((i) => i.expiresAt > now && !isOpponentRematch(i))
                .map((i) => (
                  <InviteCard
                    key={i.id}
                    invite={i}
                    act={socialAction}
                    busy={busy || !online}
                  />
                ))}
            </div>
          )}
        {!room &&
          profile &&
          (navigation.screen === "amis" ||
            navigation.screen === "historique") && (
            <section className="explore-screen">
              <button
                className="text-button screen-back"
                onClick={() => navigation.back()}
              >
                <ChevronLeft size={18} />
                Retour
              </button>
              <div className="page-heading">
                <h1>
                  {navigation.screen === "amis" ? "Mes amis" : "Mes parties"}
                </h1>
              </div>
              {navigation.screen === "amis" ? (
                <FriendsPanel
                  now={now}
                  state={social}
                  account={!!profile.credentials?.account}
                  online={online}
                  auth={() => setAuth("login")}
                  act={socialAction}
                  busy={busy}
                />
              ) : (
                <HistoryPanel
                  key={`${profile.server}:${profile.credentials?.id ?? "guest"}`}
                  profile={profile}
                  auth={() => setAuth("login")}
                />
              )}
            </section>
          )}
        {!room &&
          navigation.screen !== "amis" &&
          navigation.screen !== "historique" && (
            <Explore
              favorites={account?.favorites ?? []}
              toggleFavorite={(themeId) => {
                if (!profile?.credentials?.account) {
                  setAuth("login");
                  return;
                }
                if (!account || busy) return;
                void run(async () =>
                  updateAccount(
                    await accountApi<AccountProfile>(profile, "favorites", {
                      themeId,
                      favorite: !account.favorites.includes(themeId),
                    }),
                  ),
                );
              }}
              screen={navigation.screen}
              navigate={navigate}
              back={() => {
                setError("");
                setIntent(null);
                navigation.back();
              }}
              profile={profile}
              photo={displayedPhoto}
              accountName={account?.name}
              friendCount={
                (social?.incoming.length ?? 0) +
                (social?.invitations.filter((i) => i.expiresAt > now).length ??
                  0)
              }
              accountContent={
                <AccountActions
                  key={account?.id ?? "guest"}
                  profile={profile}
                  account={account}
                  auth={setAuth}
                  history={() => navigate("historique")}
                  friends={() => navigate("amis")}
                  logout={logout}
                  updated={updateAccount}
                />
              }
              editPhoto={() => setHeaderPanel("photo")}
              openShortcut={setHeaderPanel}
              online={online}
              busy={busy || !!intent}
              code={code}
              setCode={setCode}
              create={() => requestAction({ event: "room:create", data: {} })}
              solo={() =>
                requestAction({ event: "room:create", data: { mode: "solo" } })
              }
              join={() => requestAction({ event: "room:join", data: { code } })}
              chooseName={() => {
                setIntent(null);
                setIdentity(true);
                setError("");
              }}
              settings={() => {
                setAddress(profile?.server ?? "");
                setSettings(true);
              }}
            />
          )}
        {room && (
          <>
            <div className="duel-nav">
              <button className="text-button" onClick={() => setQuitting(true)}>
                <ChevronLeft size={18} />
                {ended ? "Accueil" : "Quitter"}
              </button>
              <span>
                ONE PIECE <i> / </i> {solo ? "CLASSIQUE SOLO" : "DUEL 1V1"}
              </span>
            </div>
            {room.phase === "lobby" && (
              <>
                <section className="lobby-title">
                  <span className="eyebrow">LE POINT DE RENDEZ-VOUS</span>
                  <h1>
                    Ton équipage
                    <br />
                    se rassemble.
                  </h1>
                  <p>Partage ce code à ton ami pour qu’il te rejoigne.</p>
                </section>
                <button
                  className="invite-code"
                  aria-label={`Copier le code ${room.code}`}
                  onClick={() =>
                    void run(async () => {
                      try {
                        await navigator.clipboard.writeText(room.code);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        throw new Error(
                          "Copie ce code manuellement : " + room.code,
                        );
                      }
                    })
                  }
                >
                  <span>CODE DU SALON</span>
                  <strong data-testid="room-code">{room.code}</strong>
                  <small>
                    {copied ? (
                      <>
                        <Check size={15} />
                        Copié
                      </>
                    ) : (
                      <>
                        <Copy size={15} />
                        Copier le code
                      </>
                    )}
                  </small>
                </button>
              </>
            )}
            {!ended && (
              <section
                className={`players ${solo ? "players-solo" : ""} ${isQuestion ? "is-playing" : ""}`}
                aria-label="Joueurs et scores"
              >
                {(solo ? [me] : [me, opponent]).map((p, i) => (
                  <div
                    className={`player ${i === 0 ? "you" : ""} ${p?.ready && (room.phase === "lobby" || room.phase === "countdown") ? "is-ready" : ""}`}
                    key={i}
                  >
                    <div className="avatar">
                      {i === 0 && p && displayedPhoto ? (
                        <img src={displayedPhoto} alt="" />
                      ) : p ? (
                        p.name.slice(0, 1).toUpperCase()
                      ) : (
                        <span>?</span>
                      )}
                      {p && (
                        <b
                          className={p.online ? "online-dot" : "offline-dot"}
                        />
                      )}
                    </div>
                    <strong>{p?.name ?? "Ton ami"}</strong>
                    <small className="ready-state">
                      {p?.ready &&
                        (room.phase === "lobby" ||
                          room.phase === "countdown") && (
                          <Check size={13} aria-hidden="true" />
                        )}
                      {!p
                        ? "En attente…"
                        : room.phase === "lobby" || room.phase === "countdown"
                          ? p.ready
                            ? "Prêt à jouer"
                            : p.online
                              ? "Dans le salon"
                              : "Hors ligne"
                          : i === 0
                            ? "TOI"
                            : p.online
                              ? "ADVERSAIRE"
                              : "HORS LIGNE"}
                    </small>
                    {isQuestion && (
                      <span className="score">
                        {(p?.score ?? 0).toLocaleString("fr-FR")}{" "}
                        <small>PTS</small>
                      </span>
                    )}
                  </div>
                ))}
                {!solo && <span className="versus">VS</span>}
              </section>
            )}
            {room.phase === "lobby" && (
              <section className="lobby-bottom">
                <button
                  className="button primary"
                  disabled={!online || busy || !opponent?.online || !!me?.ready}
                  onClick={() =>
                    void run(async () => {
                      await command(socket.current, "room:ready");
                    })
                  }
                >
                  {me?.ready ? (
                    <>
                      <Check size={20} />
                      Tu es prêt
                    </>
                  ) : (
                    <>
                      Je suis prêt
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
                <p>
                  {me?.ready
                    ? "On attend le feu vert de ton ami."
                    : opponent
                      ? "Le duel commence quand vous êtes tous les deux prêts."
                      : "Le duel sera disponible à l’arrivée de ton ami."}
                </p>
                <div className="rules">
                  <span>10 questions</span>
                  <span>Jusqu’à 1 000 points par bonne réponse</span>
                  <span>Les points diminuent avec le temps de réponse</span>
                </div>
                {social?.sentInvitations
                  .filter((i) => i.kind === "duel" && i.expiresAt > now)
                  .map((i) => (
                    <InviteCard
                      key={i.id}
                      invite={i}
                      sent
                      act={socialAction}
                      busy={busy || !online}
                    />
                  ))}
              </section>
            )}
            {room.phase === "countdown" && (
              <MatchCountdown seconds={seconds} solo={solo} />
            )}
            {isQuestion && room.question && (
              <section
                className="question-section"
                key={`${room.code}:${room.round}`}
              >
                <div className="question-meta">
                  <span>
                    QUESTION <b>{String(room.round).padStart(2, "0")}</b> /{" "}
                    {room.total}
                  </span>
                  <span className={`timer ${seconds <= 5 ? "urgent" : ""}`}>
                    {room.phase === "reveal" ? "SUITE DANS " : ""}
                    {seconds} s
                  </span>
                </div>
                <TimeBar
                  key={`${room.code}:${room.round}:${room.phase}`}
                  deadline={room.deadline}
                  duration={room.phaseDuration}
                  offset={offset}
                />
                <h1 className="question-title">{room.question.text}</h1>
                <RoundFeedback room={room} playerId={me?.id ?? ""} />
                <div
                  className={`answers ${room.submitted ? "has-selection" : ""} ${room.phase === "question" ? "accepting-answers" : ""}`}
                >
                  {room.question.choices.map((choice, i) => {
                    const correct = room.correction?.correct === i;
                    const wrong =
                      room.phase === "reveal" &&
                      room.selected === i &&
                      !correct;
                    return (
                      <button
                        key={`${room.round}-${i}`}
                        className={`answer ${room.selected === i ? "selected" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""}`}
                        aria-pressed={room.selected === i}
                        disabled={
                          !online ||
                          busy ||
                          room.phase !== "question" ||
                          room.submitted ||
                          seconds === 0
                        }
                        onClick={() =>
                          void run(async () => {
                            await command(socket.current, "room:answer", {
                              round: room.round,
                              choice: i,
                            });
                          })
                        }
                      >
                        <span className="letter">{"ABCD"[i]}</span>
                        <span className="answer-copy">
                          <span>{choice}</span>
                          {room.selected === i && (
                            <strong className="answer-confirmation">
                              {room.phase === "question"
                                ? "Réponse enregistrée"
                                : "Ta réponse"}
                            </strong>
                          )}
                        </span>
                        {correct ? (
                          <Check size={20} />
                        ) : wrong ? (
                          <X size={20} />
                        ) : room.selected === i ? (
                          <Check size={20} aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="round-status">
                  {room.phase === "reveal" && (
                    <p>{room.correction?.explanation}</p>
                  )}
                </div>
              </section>
            )}
            {ended && (
              <section className="results">
                <div className="trophy">
                  <Trophy size={42} strokeWidth={1.3} />
                </div>
                <span className="eyebrow">
                  {solo
                    ? "CLASSIQUE · SOLO"
                    : room.reason === "forfeit"
                      ? "DUEL INTERROMPU"
                      : room.phase === "cancelled"
                        ? "RENDEZ-VOUS TERMINÉ"
                        : "LE VERDICT"}
                </span>
                <h1>{result}</h1>
                {room.phase === "finished" && (
                  <ResultScoreboard room={room} playerId={me?.id ?? ""} />
                )}
                {room.phase === "finished" &&
                  room.matchId &&
                  profile?.credentials?.account && (
                    <XpResult
                      key={room.matchId}
                      profile={profile}
                      matchId={room.matchId}
                    />
                  )}
                <p className="result-description">
                  {solo
                    ? `Ton score : ${(me?.score ?? 0).toLocaleString("fr-FR")} points${room.reason === "completed" ? ` sur ${(room.total * 1000).toLocaleString("fr-FR")}` : ""}.`
                    : room.reason === "expired"
                      ? "Le salon a expiré. Un nouveau départ ?"
                      : room.reason === "forfeit"
                        ? "Un joueur a quitté le duel."
                        : room.winnerId === me?.id
                          ? "Tu connais le cap. À quand la revanche ?"
                          : room.winnerId
                            ? "La prochaine traversée sera peut-être la tienne."
                            : "Vous connaissez Grand Line aussi bien l’un que l’autre."}
                </p>
                <div className="result-actions">
                  {rematchAvailable && (
                    <div className="rematch-actions">
                      {incomingRematch && (
                        <InviteCard
                          invite={incomingRematch}
                          act={socialAction}
                          busy={busy || !online}
                        />
                      )}
                      {sentRematch && (
                        <InviteCard
                          invite={sentRematch}
                          sent
                          act={socialAction}
                          busy={busy || !online}
                        />
                      )}
                      {!sentRematch && !incomingRematch && (
                        <button
                          className="button primary"
                          disabled={!online || busy}
                          onClick={() => void socialAction("room:rematch")}
                        >
                          <RotateCcw size={20} aria-hidden="true" />
                          Revanche
                        </button>
                      )}
                      {!sentRematch && !incomingRematch && (
                        <p>Rejouer contre {opponent?.name} · One Piece</p>
                      )}
                    </div>
                  )}
                  <button
                    className="button secondary"
                    disabled={!online || busy}
                    onClick={() => void leave()}
                  >
                    Retour à l’accueil
                    <ArrowRight size={20} />
                  </button>
                </div>
                {room.phase === "finished" && (
                  <MatchReview room={room} playerId={me?.id ?? ""} />
                )}
              </section>
            )}
          </>
        )}
      </main>
      {!room && (
        <BottomNavigation screen={navigation.screen} navigate={navigate} />
      )}
      {auth && profile && (
        <AuthDialog
          adminOnly={adminOnly}
          mode={auth}
          profile={profile}
          close={() => {
            setAuth(null);
            setError("");
          }}
          success={authenticated}
        />
      )}
      {identity && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="identity-title"
          >
            <button
              className="icon-button close"
              aria-label="Fermer le choix du pseudo"
              onClick={() => {
                setIdentity(false);
                setIntent(null);
              }}
            >
              <X />
            </button>
            <span className="eyebrow">AVANT TA PREMIÈRE PARTIE</span>
            <h2 id="identity-title">Choisis ton pseudo</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void enter();
              }}
            >
              {error && (
                <div className="notice error" role="alert">
                  {error}
                </div>
              )}
              <label htmlFor="pseudo">Ton pseudo</label>
              <input
                autoFocus
                id="pseudo"
                autoComplete="nickname"
                placeholder="Ton pseudo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={20}
                required
                disabled={busy}
              />
              <button className="button primary" disabled={busy}>
                {busy ? "Connexion…" : "Continuer"}
                <ArrowRight size={18} />
              </button>
            </form>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setIdentity(false);
                setAuth("login");
              }}
            >
              J’ai déjà un compte
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setIdentity(false);
                setAuth("register");
              }}
            >
              Créer un compte
            </button>
          </section>
        </div>
      )}

      {settings && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <button
              className="icon-button close"
              aria-label="Fermer les réglages"
              onClick={() => setSettings(false)}
            >
              <X />
            </button>
            <h2 id="settings-title">Réglages</h2>
            <ThemeToggle />
            <details className="connection-settings">
              <summary>Connexion au serveur</summary>
              <p>Les deux joueurs doivent utiliser la même adresse.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void changeServer();
                }}
              >
                {error && (
                  <div className="notice error" role="alert">
                    {error}
                  </div>
                )}
                <label htmlFor="server">Adresse du serveur</label>
                <input
                  id="server"
                  type="url"
                  placeholder="https://akasha.exemple.fr"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  disabled={!!room}
                />
                {room && <p>Quitte la partie avant de changer de serveur.</p>}
                <button className="button primary" disabled={!!room || busy}>
                  Enregistrer
                </button>
              </form>
            </details>
            <p className="fineprint">
              {profile?.credentials?.account
                ? "Ton profil est sauvegardé dans ton compte."
                : "Tu utilises un profil invité sur cet appareil."}{" "}
              Version 0.5.
            </p>
          </section>
        </div>
      )}
      {headerPanel && (
        <div className="modal-backdrop">
          <section
            className="modal header-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="header-panel-title"
          >
            <button
              className="icon-button close"
              aria-label="Fermer"
              onClick={() => setHeaderPanel(null)}
            >
              <X />
            </button>
            <h2 id="header-panel-title">{headerPanels[headerPanel].title}</h2>
            {headerPanel === "photo" ? (
              <PhotoEditor
                avatar={profile?.credentials?.account ? cloudAvatar : avatar}
                cloud={!!profile?.credentials?.account}
              />
            ) : headerPanel === "level" ? (
              account ? (
                <>
                  <LevelProgress total={account.totalXp} />
                  <p>
                    Une partie terminée : 30 XP, puis 10 XP par bonne réponse.
                    En duel : +30 XP pour une victoire ou +15 XP pour une
                    égalité.
                  </p>
                  <p>
                    Ta rapidité compte pour le score du match, pas pour l’XP. Un
                    abandon ne rapporte aucune XP au joueur qui quitte.
                  </p>
                </>
              ) : (
                <p>Connecte-toi pour sauvegarder ta progression.</p>
              )
            ) : (
              <>
                <span className="coming-soon">À venir</span>
                <p>{headerPanels[headerPanel].text}</p>
              </>
            )}
          </section>
        </div>
      )}
      {quitting && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-title"
          >
            <h2 id="leave-title">
              {ended
                ? "Revenir à l’accueil ?"
                : solo
                  ? "Quitter la partie ?"
                  : "Quitter le duel ?"}
            </h2>
            <p>
              {solo
                ? "Tu pourras recommencer une nouvelle partie solo."
                : ended
                  ? "Tu pourras créer un nouveau salon."
                  : room?.phase === "lobby"
                    ? "Le salon sera fermé pour vous deux."
                    : "Ton ami remportera le duel par abandon."}
            </p>
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            <button
              autoFocus
              className="button primary"
              disabled={!online || busy}
              onClick={() => void leave()}
            >
              {ended
                ? "Revenir à l’accueil"
                : solo
                  ? "Quitter la partie"
                  : "Quitter le duel"}
            </button>
            <button
              className="button secondary"
              onClick={() => setQuitting(false)}
            >
              Rester ici
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
