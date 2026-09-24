import { useEffect, useRef, useState, type ReactNode } from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  Atom,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Crown,
  Flame,
  Gamepad2,
  Gem,
  Globe2,
  Heart,
  Landmark,
  Leaf,
  Medal,
  Moon,
  Mountain,
  ScrollText,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Star,
  Sun,
  Swords,
  Trophy,
  UserRound,
  VolumeX,
  X,
  Film,
  type LucideIcon,
} from "lucide-react";
import { themes, questions, themeById, type ThemeId } from "./data";
import {
  answerQuestion,
  correctCount,
  dailyAvailable,
  initialState,
  levelInfo,
  livesLeft,
  modeNames,
  nextQuestion,
  questionFor,
  startGame,
  type Mode,
  type State,
} from "./game";
import { loadState, saveState } from "./storage";
import Artwork from "./Artwork";

const themeIcons: Record<string, LucideIcon> = {
  anchor: Anchor,
  gamepad: Gamepad2,
  film: Film,
  landmark: Landmark,
  globe: Globe2,
  atom: Atom,
};
const avatarIcons = { leaf: Leaf, flame: Flame, moon: Moon };
type Tab = "home" | "themes" | "journal" | "profile";
const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Aventure", icon: Compass },
  { id: "themes", label: "Thèmes", icon: BookOpen },
  { id: "journal", label: "Journal", icon: ScrollText },
  { id: "profile", label: "Mon héros", icon: UserRound },
];

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-handle" />
      <div className="section-heading">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Fermer">
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Meter({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  return (
    <div
      className="meter"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <span style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}
function App() {
  const [state, setState] = useState<State>(initialState);
  const stateRef = useRef(state);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("home");
  const [setup, setSetup] = useState<Mode | null>(null);
  const [selected, setSelected] = useState<ThemeId[]>(themes.map((t) => t.id));
  const [query, setQuery] = useState("");
  const [quitting, setQuitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());
  const navigationRef = useRef({ tab, setup, quitting });
  navigationRef.current = { tab, setup, quitting };
  const headingRef = useRef<HTMLHeadingElement>(null);
  const game = state.active;
  const level = levelInfo(state.xp);
  const Avatar = avatarIcons[state.avatar];

  useEffect(() => {
    let alive = true;
    void loadState().then((result) => {
      if (alive) {
        stateRef.current = result.state;
        setState(result.state);
        setError(result.error ?? "");
        setReady(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  function update(transform: (s: State) => State) {
    const next = transform(stateRef.current);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setState(next);
    void saveState(next).catch(() =>
      setError(
        "La progression n’a pas pu être enregistrée. Vérifie l’espace disponible sur ton appareil.",
      ),
    );
  }
  useEffect(() => {
    const timer = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      const current = stateRef.current.active;
      if (
        current?.phase === "question" &&
        current.deadline !== null &&
        time >= current.deadline
      )
        update((s) =>
          answerQuestion(s, current.questionIds[current.index], null, time),
        );
    }, 200);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = NativeApp.addListener("backButton", () => {
      const nav = navigationRef.current;
      if (nav.quitting) {
        setQuitting(false);
        return;
      }
      if (nav.setup) {
        setSetup(null);
        return;
      }
      if (
        stateRef.current.active &&
        stateRef.current.active.phase !== "finished"
      )
        setQuitting(true);
      else if (stateRef.current.active || nav.tab !== "home") {
        update((s) => ({ ...s, active: null }));
        setTab("home");
      } else void NativeApp.minimizeApp();
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);
  useEffect(() => {
    headingRef.current?.focus();
  }, [game?.index, game?.phase]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  function openSetup(mode: Mode, theme?: ThemeId) {
    setSelected(theme ? [theme] : themes.map((t) => t.id));
    setSetup(mode);
  }
  function launch() {
    if (!setup) return;
    try {
      update((s) =>
        startGame(s, setup, selected, Date.now(), crypto.randomUUID()),
      );
      setSetup(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function toggleFavorite(id: ThemeId) {
    if (state.favorites.includes(id) && state.favorites.length === 1) {
      setNotice("Garde au moins un thème favori pour ton défi quotidien.");
      return;
    }
    update((s) => ({
      ...s,
      favorites: s.favorites.includes(id)
        ? s.favorites.filter((t) => t !== id)
        : [...s.favorites, id],
    }));
  }
  const dailyDone = !dailyAvailable(state, new Date(now));
  const earned = [
    {
      icon: Compass,
      title: "Premier pas",
      text: "Terminer une première partie",
      done: state.played >= 1,
    },
    {
      icon: Star,
      title: "Sans faute",
      text: "Réussir une partie parfaite",
      done: state.perfect >= 1,
    },
    {
      icon: Flame,
      title: "L’instinct de survie",
      text: "10 bonnes réponses en survie",
      done: state.bestSurvival >= 10,
    },
    {
      icon: Crown,
      title: "La voie de l’érudit",
      text: "Atteindre le niveau 5",
      done: level.level >= 5,
    },
  ];
  if (!ready)
    return (
      <div className="loading">
        <Gem size={42} />
        <p>Ton aventure se prépare…</p>
      </div>
    );

  return (
    <>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Masquer le message">
            <X size={18} />
          </button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      {game ? (
        <div className="game-shell">
          <header className="game-header">
            <button
              className="icon-button"
              aria-label="Quitter la partie"
              onClick={() =>
                game.phase === "finished"
                  ? update((s) => ({ ...s, active: null }))
                  : setQuitting(true)
              }
            >
              <ArrowLeft />
            </button>
            <div>
              <span className="eyebrow">L’AVENTURE DU SAVOIR</span>
              <strong>{modeNames[game.mode]}</strong>
            </div>
            <Gem className="accent" />
          </header>
          {game.phase === "finished" ? (
            <main className="result page-enter">
              <div className="result-emblem">
                <Trophy size={48} />
              </div>
              <span className="eyebrow">UNE PAGE DE TON HISTOIRE</span>
              <h1 ref={headingRef} tabIndex={-1}>
                {correctCount(game) === game.answers.length
                  ? "Un parcours parfait !"
                  : correctCount(game) >= game.answers.length / 2
                    ? "Bien joué, aventurier."
                    : "Chaque essai te fait grandir."}
              </h1>
              <p>
                {game.mode === "survival" && livesLeft(game) > 0
                  ? "Toute la banque sélectionnée a été parcourue !"
                  : "L’aventure continue. Ton savoir aussi."}
              </p>
              <div className="score-orb">
                <b>{correctCount(game)}</b>
                <span>sur {game.answers.length} réponses</span>
              </div>
              <div className="reward-row">
                <div>
                  <Sparkles />
                  <b>+{game.xp} XP</b>
                  <span>Expérience</span>
                </div>
                <div>
                  <Gem />
                  <b>+{game.coins}</b>
                  <span>Pièces</span>
                </div>
              </div>
              <div className="panel level-result">
                <span>
                  Niveau {level.level} · {level.title}
                </span>
                <Meter
                  value={level.current}
                  max={250}
                  label="Progression du niveau"
                />
                <small>{level.current} / 250 XP avant le prochain niveau</small>
              </div>
              <button
                className="primary full"
                onClick={() => {
                  update((s) => ({ ...s, active: null }));
                  setTab("home");
                }}
              >
                Revenir à l’aventure <ArrowRight size={18} />
              </button>
              <details className="corrections">
                <summary>Revoir mes {game.answers.length} réponses</summary>
                {game.answers.map((a) => {
                  const q = questions.find((q) => q.id === a.questionId)!;
                  return (
                    <article key={a.questionId}>
                      <span
                        className={a.correct ? "correct-text" : "wrong-text"}
                      >
                        {a.correct
                          ? "✓ Bonne réponse"
                          : a.selected === null
                            ? "⌛ Temps écoulé"
                            : "✕ À retenir"}
                      </span>
                      <h3>{q.text}</h3>
                      <p>{q.choices[q.correct]}</p>
                      <small>{q.explanation}</small>
                    </article>
                  );
                })}
              </details>
            </main>
          ) : (
            (() => {
              const q = questionFor(game);
              const answer = game.answers[game.index];
              const feedback = game.phase === "feedback";
              const seconds =
                game.deadline === null
                  ? null
                  : Math.min(
                      20,
                      Math.max(0, Math.ceil((game.deadline - now) / 1000)),
                    );
              const last =
                game.index + 1 >= game.questionIds.length ||
                (game.mode === "survival" && livesLeft(game) === 0);
              return (
                <main className="quiz page-enter">
                  <div className="quiz-status">
                    <span>
                      Question <b>{String(game.index + 1).padStart(2, "0")}</b>{" "}
                      / {game.questionIds.length}
                    </span>
                    {game.mode === "survival" ? (
                      <span
                        className="hearts"
                        aria-label={`${livesLeft(game)} vies restantes`}
                      >
                        {[1, 2, 3].map((n) => (
                          <Heart
                            key={n}
                            size={19}
                            fill={
                              n <= livesLeft(game) ? "currentColor" : "none"
                            }
                            opacity={n <= livesLeft(game) ? 1 : 0.3}
                          />
                        ))}
                      </span>
                    ) : (
                      <span>
                        <Check size={16} /> {correctCount(game)} réussies
                      </span>
                    )}
                  </div>
                  <Meter
                    value={game.index + (feedback ? 1 : 0)}
                    max={game.questionIds.length}
                    label="Avancement du quiz"
                  />
                  <div className="question-meta">
                    <span className="pill">{themeById(q.theme).name}</span>
                    <span
                      className={`timer ${seconds !== null && seconds <= 5 && !feedback ? "urgent" : ""}`}
                      role="timer"
                      aria-label={
                        seconds === null
                          ? "Sans chrono"
                          : `${seconds} secondes restantes`
                      }
                    >
                      {feedback
                        ? "Réponse validée"
                        : seconds === null
                          ? "À ton rythme"
                          : `${seconds} s`}
                    </span>
                  </div>
                  <h1 className="question" ref={headingRef} tabIndex={-1}>
                    {q.text}
                  </h1>
                  <div className="answers">
                    {game.orders[game.index].map((choice, i) => (
                      <button
                        key={choice}
                        disabled={feedback}
                        className={`answer ${feedback && choice === q.correct ? "is-correct" : ""} ${feedback && answer.selected === choice && !answer.correct ? "is-wrong" : ""}`}
                        onClick={() =>
                          update((s) =>
                            answerQuestion(s, q.id, choice, Date.now()),
                          )
                        }
                      >
                        <span className="answer-letter">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{q.choices[choice]}</span>
                        {feedback && choice === q.correct && (
                          <Check size={20} />
                        )}
                      </button>
                    ))}
                  </div>
                  {feedback ? (
                    <div
                      className={`feedback ${answer.correct ? "success" : ""}`}
                      role="status"
                    >
                      <strong>
                        {answer.correct
                          ? "Bien vu ! +15 XP à la fin de la partie"
                          : answer.selected === null
                            ? "Le temps est écoulé."
                            : "Presque… Voici ce qu’il faut retenir."}
                      </strong>
                      <p>{q.explanation}</p>
                      <button
                        className="primary full"
                        onClick={() =>
                          update((s) => nextQuestion(s, Date.now()))
                        }
                      >
                        {last ? "Découvrir mes résultats" : "Question suivante"}
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  ) : (
                    <p className="quiz-hint">
                      <Shield size={14} /> Une seule réponse. Fais confiance à
                      ton savoir.
                    </p>
                  )}
                </main>
              );
            })()
          )}
        </div>
      ) : (
        <div className="app-shell">
          <aside className="sidebar">
            <a
              href="#"
              className="brand"
              onClick={(e) => {
                e.preventDefault();
                setTab("home");
              }}
            >
              <span className="brand-mark">
                <Gem size={26} />
              </span>
              <span>
                QuizzGame<small>L’AVENTURE DU SAVOIR</small>
              </span>
            </a>
            <p className="nav-label">TON UNIVERS</p>
            <nav aria-label="Navigation principale">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  className={tab === t.id ? "nav-item active" : "nav-item"}
                  aria-current={tab === t.id ? "page" : undefined}
                  onClick={() => setTab(t.id)}
                >
                  <t.icon size={21} />
                  <span>{t.label}</span>
                  {tab === t.id && <span className="nav-dot" />}
                </button>
              ))}
            </nav>
            <div className="sidebar-note">
              <Mountain size={30} />
              <p>
                Les grandes aventures
                <br />
                commencent par une question.
              </p>
              <span>VERSION 0.1 · HORS LIGNE</span>
            </div>
            <button
              className="sidebar-profile"
              onClick={() => setTab("profile")}
            >
              <span className="avatar small">
                <Avatar size={22} />
              </span>
              <span>
                {state.name}
                <small>
                  Niveau {level.level} · {level.title}
                </small>
              </span>
              <ChevronRight size={16} />
            </button>
          </aside>
          <div className="main-column">
            <header className="topbar">
              <div className="mobile-brand">
                <Gem size={23} /> QuizzGame
              </div>
              <span className="breadcrumb">
                Ton univers <ChevronRight size={13} />{" "}
                {tabs.find((t) => t.id === tab)?.label}
              </span>
              <div className="topbar-right">
                <span className="offline">
                  <i /> Hors ligne
                </span>
                <span className="currency">
                  <Gem size={17} /> {state.coins}
                </span>
                <button
                  className="avatar small"
                  aria-label="Ouvrir mon profil"
                  onClick={() => setTab("profile")}
                >
                  <Avatar size={20} />
                </button>
              </div>
            </header>
            <main className="content" id="main">
              {tab === "home" && (
                <div className="page-enter">
                  <div className="welcome">
                    <div>
                      <span className="eyebrow">
                        CHAQUE QUESTION EST UN NOUVEAU DÉPART
                      </span>
                      <h1>
                        À toi l’aventure<span className="accent">.</span>
                      </h1>
                      <p>
                        Bienvenue, {state.name}. Le savoir est ton meilleur
                        pouvoir.
                      </p>
                    </div>
                    <span className="chapter">
                      CHAPITRE 01 <span>Les premiers pas</span>
                    </span>
                  </div>
                  <div className="home-grid">
                    <section className="hero">
                      <Artwork />
                      <div className="hero-copy">
                        <span className="hero-tag">
                          <Sparkles size={13} /> TON VOYAGE COMMENCE ICI
                        </span>
                        <h2>
                          Un monde à découvrir.
                          <br />
                          <em>Un héros à devenir.</em>
                        </h2>
                        <p>
                          Explore tes univers préférés,
                          <br />
                          relève des défis et gagne de l’expérience.
                        </p>
                        <button
                          className="primary"
                          onClick={() => openSetup("expedition")}
                        >
                          Partir à l’aventure <ArrowRight size={18} />
                        </button>
                        <small>10 questions · Tous les niveaux</small>
                      </div>
                      <span className="art-caption">
                        LES TERRES DU SAVOIR <span>01 / ∞</span>
                      </span>
                    </section>
                    <section className="panel hero-profile">
                      <div className="section-heading">
                        <span className="eyebrow">TON PERSONNAGE</span>
                        <span className="pill">NIV. {level.level}</span>
                      </div>
                      <div className="avatar large">
                        <Avatar size={42} />
                        <span>{level.level}</span>
                      </div>
                      <h2>{state.name}</h2>
                      <p>{level.title}</p>
                      <div className="xp-label">
                        <span>Expérience</span>
                        <b>
                          {level.current}
                          <small> / 250 XP</small>
                        </b>
                      </div>
                      <Meter
                        value={level.current}
                        max={250}
                        label="Expérience du héros"
                      />
                      <div className="mini-stats">
                        <div>
                          <b>{state.played}</b>
                          <span>Parties</span>
                        </div>
                        <div>
                          <b>
                            {state.answered
                              ? Math.round(
                                  (state.correct / state.answered) * 100,
                                )
                              : 0}
                            %
                          </b>
                          <span>Réussite</span>
                        </div>
                        <div>
                          <b>{earned.filter((e) => e.done).length}</b>
                          <span>Succès</span>
                        </div>
                      </div>
                    </section>
                  </div>
                  <div className="section-heading section-space">
                    <div>
                      <h2>Choisis ta prochaine quête</h2>
                      <p>Une petite pause. Une grande aventure.</p>
                    </div>
                    <Swords size={23} className="muted" />
                  </div>
                  <div className="modes">
                    <button
                      className="mode-card daily"
                      onClick={() => openSetup("daily")}
                      disabled={dailyDone}
                    >
                      <span className="mode-icon">
                        <Sun size={25} />
                      </span>
                      <span className="mode-body">
                        <span className="mode-eyebrow">
                          {dailyDone ? "À DEMAIN" : "UNE FOIS PAR JOUR"}
                        </span>
                        <strong>Le défi du jour</strong>
                        <span>10 questions sur tes thèmes favoris.</span>
                        <span className="mode-footer">
                          {dailyDone
                            ? "Défi déjà tenté aujourd’hui"
                            : "20 s / question"}{" "}
                          <ArrowRight size={16} />
                        </span>
                      </span>
                    </button>
                    <button
                      className="mode-card survival"
                      onClick={() => openSetup("survival")}
                    >
                      <span className="mode-icon">
                        <Flame size={25} />
                      </span>
                      <span className="mode-body">
                        <span className="mode-eyebrow">
                          REPOUSSE TES LIMITES
                        </span>
                        <strong>Survie</strong>
                        <span>Trois vies. Jusqu’où iras-tu ?</span>
                        <span className="mode-footer">
                          Record : {state.bestSurvival} bonnes réponses{" "}
                          <ArrowRight size={16} />
                        </span>
                      </span>
                    </button>
                    <div className="mode-card future">
                      <span className="mode-icon">
                        <Swords size={25} />
                      </span>
                      <span className="mode-body">
                        <span className="mode-eyebrow">PROCHAINE ÉTAPE</span>
                        <strong>L’arène des duels</strong>
                        <span>Affronte d’autres aventuriers en 1v1.</span>
                        <span className="mode-footer">
                          Multijoueur en préparation <Shield size={15} />
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="section-heading section-space">
                    <div>
                      <h2>Des univers à explorer</h2>
                      <p>Deviens incollable sur ce que tu aimes.</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setTab("themes")}
                    >
                      Tout voir <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="theme-preview">
                    {themes.slice(0, 4).map((t) => {
                      const Icon = themeIcons[t.symbol];
                      return (
                        <button
                          key={t.id}
                          className="theme-tile"
                          onClick={() => openSetup("expedition", t.id)}
                          style={{ "--theme": t.color } as React.CSSProperties}
                        >
                          <div className="theme-tile-art">
                            <Icon size={39} />
                            <span className="orb-line" />
                            <span className="tile-number">
                              0{themes.indexOf(t) + 1}
                            </span>
                          </div>
                          <span className="theme-tile-label">
                            <strong>{t.name}</strong>
                            <small>
                              10 questions <ChevronRight size={14} />
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <footer className="page-footer">
                    <Leaf size={14} />
                    <span>
                      Un peu plus curieux. Un peu plus fort. Chaque jour.
                    </span>
                  </footer>
                </div>
              )}
              {tab === "themes" && (
                <div className="page-enter">
                  <div className="welcome">
                    <div>
                      <span className="eyebrow">
                        LA CURIOSITÉ N’A PAS DE FRONTIÈRES
                      </span>
                      <h1>Tes univers.</h1>
                      <p>
                        Explore un thème ou ajoute-le à tes favoris pour le défi
                        du jour.
                      </p>
                    </div>
                  </div>
                  <label className="search">
                    <Search size={20} />
                    <input
                      placeholder="Chercher un univers…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label="Chercher un thème"
                    />
                  </label>
                  <div className="theme-grid">
                    {themes
                      .filter((t) =>
                        t.name
                          .toLocaleLowerCase("fr")
                          .includes(query.toLocaleLowerCase("fr")),
                      )
                      .map((t) => {
                        const Icon = themeIcons[t.symbol];
                        return (
                          <article
                            key={t.id}
                            className="theme-card"
                            style={
                              { "--theme": t.color } as React.CSSProperties
                            }
                          >
                            <div className="theme-card-art">
                              <Icon size={46} />
                              <button
                                className={`favorite ${state.favorites.includes(t.id) ? "selected" : ""}`}
                                aria-label={`${state.favorites.includes(t.id) ? "Retirer" : "Ajouter"} ${t.name} ${state.favorites.includes(t.id) ? "des" : "aux"} favoris`}
                                aria-pressed={state.favorites.includes(t.id)}
                                onClick={() => toggleFavorite(t.id)}
                              >
                                <Star
                                  size={19}
                                  fill={
                                    state.favorites.includes(t.id)
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                              </button>
                            </div>
                            <div className="theme-card-copy">
                              <span className="eyebrow">
                                10 QUESTIONS · DÉCOUVERTE
                              </span>
                              <h2>
                                {t.name}{" "}
                                {state.mastered.includes(t.id) && (
                                  <Medal size={20} className="accent" />
                                )}
                              </h2>
                              <p>{t.subtitle}</p>
                              <button
                                className="secondary full"
                                onClick={() => openSetup("expedition", t.id)}
                              >
                                Explorer <ArrowRight size={17} />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                  </div>
                  {!themes.some((t) =>
                    t.name
                      .toLocaleLowerCase("fr")
                      .includes(query.toLocaleLowerCase("fr")),
                  ) && (
                    <div className="empty-state">
                      <Search size={32} />
                      <h2>Aucun univers trouvé</h2>
                      <p>
                        Essaie un autre mot, ou explore les six thèmes
                        disponibles.
                      </p>
                      <button
                        className="secondary"
                        onClick={() => setQuery("")}
                      >
                        Voir tous les thèmes
                      </button>
                    </div>
                  )}
                  <p className="footnote">
                    60 questions embarquées pour cette première version.
                    D’autres thèmes de ta liste arriveront ensuite.
                  </p>
                </div>
              )}
              {tab === "journal" && (
                <div className="page-enter">
                  <div className="welcome">
                    <div>
                      <span className="eyebrow">
                        CHAQUE VICTOIRE LAISSE UNE TRACE
                      </span>
                      <h1>Ton journal.</h1>
                      <p>Les étapes de ton aventure, petites et grandes.</p>
                    </div>
                  </div>
                  <h2>Les marques du héros</h2>
                  <div className="achievements">
                    {earned.map((a) => (
                      <article
                        key={a.title}
                        className={`achievement ${a.done ? "unlocked" : ""}`}
                      >
                        <span className="achievement-icon">
                          <a.icon size={26} />
                        </span>
                        <div>
                          <h3>{a.title}</h3>
                          <p>{a.text}</p>
                          <small>{a.done ? "Débloqué" : "À accomplir"}</small>
                        </div>
                        {a.done && <Check size={18} />}
                      </article>
                    ))}
                  </div>
                  <div className="section-heading section-space">
                    <h2>Tes dernières expéditions</h2>
                    <span className="pill">{state.played} parties</span>
                  </div>
                  {state.history.length ? (
                    <div className="history-list">
                      {state.history.map((h) => (
                        <article className="history-row" key={h.id}>
                          <span className="history-icon">
                            <Swords size={22} />
                          </span>
                          <div>
                            <strong>{modeNames[h.mode]}</strong>
                            <small>
                              {new Date(
                                `${h.date}T12:00:00`,
                              ).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "long",
                              })}{" "}
                              · {h.correct}/{h.total} réponses
                            </small>
                          </div>
                          <b>+{h.xp} XP</b>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <ScrollText size={36} />
                      <h3>La première page est à écrire.</h3>
                      <p>Termine une partie pour commencer ton histoire.</p>
                      <button
                        className="primary"
                        onClick={() => openSetup("expedition")}
                      >
                        Écrire mon premier chapitre <ArrowRight size={17} />
                      </button>
                    </div>
                  )}
                </div>
              )}
              {tab === "profile" && (
                <div className="page-enter">
                  <div className="welcome">
                    <div>
                      <span className="eyebrow">LE HÉROS, C’EST TOI</span>
                      <h1>À ton image.</h1>
                      <p>Un nom, un emblème, et tout un monde devant toi.</p>
                    </div>
                  </div>
                  <div className="profile-grid">
                    <section className="panel profile-editor">
                      <div className="avatar large">
                        <Avatar size={42} />
                      </div>
                      <h2>
                        Niveau {level.level} · {level.title}
                      </h2>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const data = new FormData(e.currentTarget);
                          const name = String(data.get("name")).trim();
                          if (name) {
                            update((s) => ({ ...s, name }));
                            setNotice("Ton nom de héros est enregistré.");
                          }
                        }}
                      >
                        <label className="field-label" htmlFor="name">
                          Ton nom d’aventurier
                        </label>
                        <input
                          id="name"
                          name="name"
                          maxLength={24}
                          minLength={1}
                          required
                          defaultValue={state.name}
                          className="text-input"
                        />
                        <span className="field-label">Ton emblème</span>
                        <div className="avatar-options">
                          {(["leaf", "flame", "moon"] as const).map((id, i) => {
                            const Icon = avatarIcons[id];
                            return (
                              <button
                                type="button"
                                key={id}
                                className={
                                  state.avatar === id ? "selected" : ""
                                }
                                aria-pressed={state.avatar === id}
                                aria-label={["Feuille", "Flamme", "Lune"][i]}
                                onClick={() =>
                                  update((s) => ({ ...s, avatar: id }))
                                }
                              >
                                <Icon size={26} />
                              </button>
                            );
                          })}
                        </div>
                        <button className="primary full" type="submit">
                          Enregistrer mon nom <Check size={18} />
                        </button>
                      </form>
                    </section>
                    <div>
                      <section className="panel settings">
                        <h2>
                          <Settings2 size={21} /> À ton rythme
                        </h2>
                        <label className="toggle-row">
                          <span>
                            <strong>Chronomètre</strong>
                            <small>
                              20 secondes en expédition et survie.
                              <br />
                              Toujours actif pour le défi quotidien.
                            </small>
                          </span>
                          <input
                            type="checkbox"
                            checked={state.timed}
                            onChange={(e) =>
                              update((s) => ({ ...s, timed: e.target.checked }))
                            }
                          />
                        </label>
                        <div className="setting-note">
                          <VolumeX size={19} />
                          <span>
                            Une aventure silencieuse pour jouer partout.
                          </span>
                        </div>
                      </section>
                      <section className="panel privacy">
                        <Shield size={25} />
                        <h3>Ton aventure reste avec toi.</h3>
                        <p>
                          Ton profil et tes parties sont enregistrés sur cet
                          appareil, sans compte et sans publicité. Désinstaller
                          l’application peut effacer ta progression.
                        </p>
                        <p>
                          Les pièces sont des récompenses de jeu. Elles n’ont
                          pas encore de boutique associée.
                        </p>
                        <span className="eyebrow">
                          QUIZZGAME · PROTOTYPE ANDROID 0.1
                        </span>
                      </section>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
          <nav className="bottom-nav" aria-label="Navigation mobile">
            {tabs.map((t) => (
              <button
                key={t.id}
                aria-current={tab === t.id ? "page" : undefined}
                className={tab === t.id ? "active" : ""}
                onClick={() => {
                  setTab(t.id);
                  window.scrollTo({ top: 0 });
                }}
              >
                <t.icon size={21} />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
      {setup && (
        <Modal title={modeNames[setup]} onClose={() => setSetup(null)}>
          <p className="sheet-intro">
            {setup === "daily"
              ? "10 questions de tes thèmes favoris. Une seule tentative par jour sur cet appareil : elle est utilisée dès le départ."
              : setup === "survival"
                ? "Trois vies pour aller le plus loin possible, sans répéter une question. La partie s’arrête au bout de la banque sélectionnée."
                : "Dix questions, de nouvelles découvertes et de l’expérience pour ton héros."}
          </p>
          <h3>
            {setup === "daily" ? "Tes thèmes favoris" : "Choisis tes univers"}
          </h3>
          <div className="theme-chips">
            {themes
              .filter(
                (t) => setup !== "daily" || state.favorites.includes(t.id),
              )
              .map((t) => (
                <button
                  key={t.id}
                  disabled={setup === "daily"}
                  aria-pressed={setup === "daily" || selected.includes(t.id)}
                  className={
                    setup === "daily" || selected.includes(t.id)
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    setSelected((s) =>
                      s.includes(t.id)
                        ? s.filter((id) => id !== t.id)
                        : [...s, t.id],
                    )
                  }
                >
                  {t.name}
                  {(setup === "daily" || selected.includes(t.id)) && (
                    <Check size={14} />
                  )}
                </button>
              ))}
          </div>
          <div className="setup-details">
            <span>
              <BookOpen size={16} />
              {setup === "survival" ? selected.length * 10 : 10} questions
            </span>
            <span>
              <Sun size={16} />
              {setup === "daily" || state.timed
                ? "20 s / question"
                : "Sans chrono"}
            </span>
          </div>
          <button
            className="primary full"
            disabled={
              (setup !== "daily" && !selected.length) ||
              (setup === "daily" && dailyDone)
            }
            onClick={launch}
          >
            Commencer {setup === "daily" ? "le défi" : "l’aventure"}
            <ArrowRight size={18} />
          </button>
          <p className="footnote">
            {setup === "daily"
              ? "La partie peut être reprise après fermeture de l’application."
              : "Tu peux désactiver le chrono dans Mon héros."}
          </p>
        </Modal>
      )}
      {quitting && (
        <Modal
          title="Quitter cette aventure ?"
          onClose={() => setQuitting(false)}
        >
          <p className="sheet-intro">
            Quitter abandonne la partie sans récompense.
            {game?.mode === "daily"
              ? " Ta tentative quotidienne restera utilisée."
              : ""}{" "}
            Le chronomètre continue pendant cette décision.
          </p>
          <button className="primary full" onClick={() => setQuitting(false)}>
            Continuer la partie
          </button>
          <button
            className="danger-button full"
            onClick={() => {
              update((s) => ({ ...s, active: null }));
              setQuitting(false);
              setTab("home");
            }}
          >
            Abandonner la partie
          </button>
        </Modal>
      )}
    </>
  );
}
export default App;
