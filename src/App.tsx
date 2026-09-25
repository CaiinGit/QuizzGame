import { useEffect, useRef, useState } from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Compass,
  Copy,
  Settings2,
  Swords,
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
import type { RoomView } from "../shared/protocol";

export default function App() {
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
    pending = useRef(false),
    roomRef = useRef(room);
  roomRef.current = room;
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
    s.on("disconnect", () => setOnline(false));
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
      if (roomRef.current) setQuitting(true);
      else NativeApp.minimizeApp();
    });
    return () => {
      void listener.then((l) => l.remove());
    };
  }, []);
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
      const server = serverUrl(profile!.server);
      const credentials = await createSession(server, name.trim());
      const next = { server, credentials };
      await saveProfile(next);
      setProfile(next);
    });
  }
  async function changeServer() {
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
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">
          AKASHA<span>LE SAVOIR FAIT LA FORCE</span>
        </div>
        <button
          className="icon-button"
          aria-label="Réglages de connexion"
          onClick={() => {
            setAddress(profile?.server ?? "");
            setSettings(true);
          }}
        >
          <Settings2 size={20} />
        </button>
      </header>
      <main>
        {error && !settings && !quitting && (
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
          <>
            <section className="intro">
              <div className="eyebrow">
                <span className="dot" /> QUIZ · DUEL ENTRE AMIS
              </div>
              <h1>
                À deux.
                <br />À armes <em>égales.</em>
              </h1>
              <p>
                Un univers. Dix questions.
                <br />
                Qui connaît le mieux Grand Line ?
              </p>
            </section>
            <section className="theme-card" aria-label="Thème One Piece">
              <div className="chart" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <Compass size={113} strokeWidth={0.65} />
                <span className="north">N</span>
                <span className="coord">22° 00′ N · GRAND LINE</span>
              </div>
              <div className="theme-content">
                <span className="pill">LE THÈME DU MOMENT</span>
                <h2>One Piece</h2>
                <p>
                  Le cap est donné.
                  <br />À toi de faire la différence.
                </p>
                <div className="theme-meta">
                  <span>10 questions</span>
                  <i />
                  <span>20 s par question</span>
                </div>
              </div>
            </section>
            {!profile?.credentials ? (
              <form
                className="entry"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!profile?.server) {
                    setSettings(true);
                    return;
                  }
                  void enter();
                }}
              >
                <label htmlFor="pseudo">Ton nom d’aventurier</label>
                <input
                  id="pseudo"
                  autoComplete="nickname"
                  placeholder="Ton pseudo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={20}
                  required
                />
                <button className="button primary" disabled={busy}>
                  {busy ? "Connexion…" : "Prendre le large"}
                  <ArrowRight size={20} />
                </button>
                {!profile?.server && (
                  <p className="muted">
                    Configure l’adresse de ton serveur pour commencer.
                  </p>
                )}
              </form>
            ) : (
              <section className="entry">
                <div className="welcome">
                  <p>
                    À toi de jouer, <strong>{profile.credentials.name}</strong>.
                  </p>
                  <span className={online ? "connection online" : "connection"}>
                    {online ? "En ligne" : "Connexion…"}
                  </span>
                </div>
                <button
                  className="button primary"
                  disabled={!online || busy}
                  onClick={() =>
                    void run(async () => {
                      await command(socket.current, "room:create");
                    })
                  }
                >
                  <Swords size={20} />
                  Créer un duel
                  <ArrowRight size={20} />
                </button>
                <div className="divider">
                  <span>ou rejoins ton ami</span>
                </div>
                <form
                  className="join-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await command(socket.current, "room:join", { code });
                    });
                  }}
                >
                  <label className="sr-only" htmlFor="code">
                    Code du salon
                  </label>
                  <input
                    id="code"
                    placeholder="CODE DU SALON"
                    autoCapitalize="characters"
                    autoComplete="off"
                    maxLength={6}
                    minLength={6}
                    required
                    value={code}
                    onChange={(e) =>
                      setCode(
                        e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""),
                      )
                    }
                  />
                  <button
                    className="button secondary"
                    disabled={!online || busy || code.length !== 6}
                  >
                    Rejoindre
                  </button>
                </form>
              </section>
            )}
            <footer className="home-footer">
              <span>1 CONTRE 1</span>
              <span>La même question. Le même temps.</span>
            </footer>
          </>
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
                    {p ? p.name.slice(0, 1).toUpperCase() : <span>?</span>}
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
            <span className="eyebrow">AKASHA · CONNEXION</span>
            <h2 id="settings-title">Votre point de rencontre.</h2>
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
                autoFocus
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
            <p className="fineprint">
              Ton pseudo est enregistré sur ce téléphone. Version de test 0.2.
            </p>
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
