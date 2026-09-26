import { useEffect, useRef, useState } from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Copy,
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
import { useAvatar } from "./avatar";
type Intent =
  | { event: "room:create"; data: Record<string, never> }
  | { event: "room:join"; data: { code: string } };
import type { RoomView } from "../shared/protocol";

export default function App() {
  const navigation = useNavigation();
  const avatar = useAvatar();
  const [headerPanel, setHeaderPanel] = useState<HeaderPanel | null>(null);
  const [identity, setIdentity] = useState(false),
    [intent, setIntent] = useState<Intent | null>(null),
    [synced, setSynced] = useState(false);
  const backRef = useRef(() => {});
  backRef.current = () => {
    if (identity) {
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
    pending = useRef(false);
  useEffect(() => {
    setIntent(null);
    setIdentity(false);
    setError("");
  }, [navigation.screen]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [room?.code, room?.phase === "finished", room?.phase === "cancelled"]);
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
    const s = connect(profile);
    socket.current = s;
    let disposed = false;
    const sync = async () => {
      const sent = Date.now();
      try {
        const result = await command<{ serverNow: number }>(s, "sync");
        offset.current = result.serverNow - (sent + Date.now()) / 2;
      } catch {
        /* Automatic reconnect will retry. */
      }
    };
    s.on("connect", () => {
      setOnline(true);
      setError("");
      void sync();
    });
    s.on("disconnect", () => {
      setOnline(false);
      setSynced(false);
    });
    s.on("connect_error", (e) => {
      setOnline(false);
      if (e.message === "SESSION_EXPIRED") {
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
      offset.current = state ? state.serverNow - Date.now() : offset.current;
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
  }, [profile]);
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
    if (!intent || !profile?.credentials || !online || !synced || busy || room)
      return;
    setIntent(null);
    void run(async () => {
      await command(socket.current, intent.event, intent.data);
    });
  }, [intent, profile, online, synced, busy, room]);
  useEffect(() => {
    if (!identity && !settings && !quitting && !headerPanel) return;
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
  }, [identity, settings, quitting, headerPanel]);
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
  const result =
    room?.phase === "cancelled"
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
        photo={avatar.photo}
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
        {error && !settings && !quitting && !identity && (
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
            <Wifi size={18} /> Reconnexion en cours… Le duel continue sur le
            serveur.
          </div>
        )}
        {!room && (
          <Explore
            screen={navigation.screen}
            navigate={navigate}
            back={() => {
              setError("");
              setIntent(null);
              navigation.back();
            }}
            profile={profile}
            photo={avatar.photo}
            editPhoto={() => setHeaderPanel("photo")}
            openShortcut={setHeaderPanel}
            online={online}
            busy={busy || !!intent}
            code={code}
            setCode={setCode}
            create={() => requestAction({ event: "room:create", data: {} })}
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
                ONE PIECE <i> / </i> DUEL 1V1
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
            <section className="players" aria-label="Joueurs et scores">
              {[me, opponent].map((p, i) => (
                <div className={`player ${i === 0 ? "you" : ""}`} key={i}>
                  <div className="avatar">
                    {i === 0 && p && avatar.photo ? (
                      <img src={avatar.photo} alt="" />
                    ) : p ? (
                      p.name.slice(0, 1).toUpperCase()
                    ) : (
                      <span>?</span>
                    )}
                    {p && (
                      <b className={p.online ? "online-dot" : "offline-dot"} />
                    )}
                  </div>
                  <strong>{p?.name ?? "Ton ami"}</strong>
                  <small>
                    {!p
                      ? "En attente…"
                      : room.phase === "lobby"
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
                  {room.phase !== "lobby" && (
                    <span className="score">
                      {(p?.score ?? 0).toLocaleString("fr-FR")}{" "}
                      <small>PTS</small>
                    </span>
                  )}
                </div>
              ))}
              <span className="versus">VS</span>
            </section>
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
                  <span>+1 000 par bonne réponse</span>
                  <span>Aucun bonus de vitesse</span>
                </div>
              </section>
            )}
            {room.phase === "countdown" && (
              <section className="countdown" role="status">
                <span className="eyebrow">PRÊTS À PRENDRE LA MER ?</span>
                <strong>{seconds || 1}</strong>
                <p>Votre duel commence…</p>
              </section>
            )}
            {isQuestion && room.question && (
              <section className="question-section">
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
                <div className="time-track">
                  <div
                    style={{
                      width: `${Math.min(100, (seconds / (room.phase === "reveal" ? 4.5 : 20)) * 100)}%`,
                    }}
                  />
                </div>
                <h1 className="question-title">{room.question.text}</h1>
                <div className="answers">
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
                        <span>{choice}</span>
                        {correct ? (
                          <Check size={20} />
                        ) : wrong ? (
                          <X size={20} />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div aria-live="polite" className="round-status">
                  {room.phase === "reveal" ? (
                    <>
                      <strong>
                        {room.correction?.answers[me!.id]?.points
                          ? "+1 000 points · Bien joué !"
                          : room.selected === null
                            ? "Temps écoulé"
                            : "La bonne réponse"}
                      </strong>
                      <p>{room.correction?.explanation}</p>
                      <small>
                        {opponent?.name} :{" "}
                        {room.correction?.answers[opponent?.id ?? ""]?.points
                          ? "+1 000 points"
                          : "0 point"}
                      </small>
                    </>
                  ) : room.submitted ? (
                    <p>
                      <Check size={17} />
                      Réponse envoyée. À ton ami de jouer…
                    </p>
                  ) : (
                    <p>
                      {opponent?.answered
                        ? "Ton ami a répondu. À toi !"
                        : "Une seule réponse. Fais-toi confiance."}
                    </p>
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
                  {room.reason === "forfeit"
                    ? "DUEL INTERROMPU"
                    : room.phase === "cancelled"
                      ? "RENDEZ-VOUS TERMINÉ"
                      : "LE VERDICT"}
                </span>
                <h1>{result}</h1>
                <p>
                  {room.reason === "expired"
                    ? "Le salon a expiré. Un nouveau départ ?"
                    : room.reason === "forfeit"
                      ? "Un joueur a quitté le duel."
                      : room.winnerId === me?.id
                        ? "Tu connais le cap. À quand la revanche ?"
                        : room.winnerId
                          ? "La prochaine traversée sera peut-être la tienne."
                          : "Vous connaissez Grand Line aussi bien l’un que l’autre."}
                </p>
                <button
                  className="button primary"
                  disabled={!online || busy}
                  onClick={() => void leave()}
                >
                  Retour à l’accueil
                  <ArrowRight size={20} />
                </button>
              </section>
            )}
          </>
        )}
      </main>
      {!room && (
        <BottomNavigation screen={navigation.screen} navigate={navigate} />
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
            <span className="eyebrow">AVANT TON PREMIER DUEL</span>
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
                {room && <p>Quitte le duel avant de changer de serveur.</p>}
                <button className="button primary" disabled={!!room || busy}>
                  Enregistrer
                </button>
              </form>
            </details>
            <p className="fineprint">
              Ton pseudo est enregistré sur ce téléphone. Version de test 0.3.
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
              <PhotoEditor avatar={avatar} />
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
              {ended ? "Revenir à l’accueil ?" : "Quitter le duel ?"}
            </h2>
            <p>
              {ended
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
              {ended ? "Revenir à l’accueil" : "Quitter le duel"}
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
