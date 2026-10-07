import {
  ChevronLeft,
  ArrowRight,
  Check,
  Settings2,
  Users,
  Star,
  Plus,
} from "lucide-react";
import { themes, themeName } from "../shared/themes";
import type { ReactNode } from "react";
import { PixelIcon } from "./PixelIcon";
import { HomePortal, usePortalEntry } from "./HomePortal";
import { ArcadeIcon, PortraitFrame } from "./ArcadeArt";
import { SelectionCard, FutureSelectionCard, ThemeLogo } from "./SelectionCard";
import type { Screen } from "./navigation";
import { screenTheme, isThemeScreen, themeRoute } from "./navigation";
import type { Profile } from "./client";

type Props = {
  difficultyPicker: ReactNode;
  canStart: boolean;
  accountContent?: ReactNode;
  accountName?: string;
  friendCount?: number;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  screen: Screen;
  navigate: (screen: Screen) => void;
  back: () => void;
  profile: Profile | null;
  photo: string | null;
  editPhoto: () => void;
  openShortcut: (panel: "daily" | "favorites") => void;
  online: boolean;
  busy: boolean;
  code: string;
  setCode: (code: string) => void;
  create: () => void;
  solo: () => void;
  join: () => void;
  chooseName: () => void;
  settings: () => void;
};
export function BottomNavigation({
  screen,
  navigate,
}: {
  screen: Screen;
  navigate: (screen: Screen) => void;
}) {
  const active = [
    "one-piece",
    "rejoindre",
    "solo",
    "solo-one-piece",
    "favorite-one-piece",
    "mcu",
    "solo-mcu",
    "favorite-mcu",
  ].includes(screen)
    ? "classique"
    : screen;
  const items = [
    { screen: "classement", label: "Classement", icon: "podium" },
    { screen: "accueil", label: "Accueil", icon: "home" },
    { screen: "classique", label: "Thèmes", icon: "book" },
    { screen: "boutique", label: "Boutique", icon: "chest" },
  ] as const;
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {items.map((item) => (
        <button
          key={item.screen}
          type="button"
          aria-current={active === item.screen ? "page" : undefined}
          onClick={() => navigate(item.screen)}
        >
          <span>
            <ArcadeIcon name={item.icon} />
          </span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
export function Explore(p: Props) {
  const { screen, navigate, profile, online, busy } = p;
  const portal = usePortalEntry(
    screen,
    () => navigate("mode"),
    () => navigate("accueil"),
  );
  const themeId = screenTheme(screen);
  const isFavorite = screen.startsWith("favorite-");
  const isSolo = screen.startsWith("solo-");
  if (screen === "accueil")
    return (
      <section className="home-screen" aria-label="Accueil Akasha">
        {portal.transition}
        <h1 className="sr-only">Accueil</h1>
        <div className="home-shortcuts">
          <button
            className="home-tile daily-challenge"
            aria-label="Défi du jour"
            onClick={() => p.openShortcut("daily")}
          >
            <ArcadeIcon name="daily" />
            <span className="daily-label">
              <strong>DÉFI DU JOUR</strong>
              <small>À venir</small>
            </span>
            <span className="daily-arrow" aria-hidden="true">
              ›
            </span>
          </button>
          <div
            className="favorite-slots"
            role="group"
            aria-label="Thèmes favoris"
          >
            {[1, 2, 3].map((slot) => {
              const theme = themes.find((t) => t.id === p.favorites[slot - 1]);
              return (
                <button
                  key={slot}
                  className="home-tile favorite-slot"
                  aria-label={
                    theme
                      ? `Thème favori ${slot}, ${theme.name}`
                      : `Thème favori ${slot}, ajouter un thème`
                  }
                  onClick={() =>
                    navigate(
                      theme ? themeRoute(theme.id, "favorite") : "classique",
                    )
                  }
                >
                  {theme ? (
                    <>
                      <ThemeLogo themeId={theme.id} />
                      <span className="favorite-name">{theme.name}</span>
                    </>
                  ) : (
                    <Plus size={24} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="portal-stage">
          <button
            type="button"
            className="home-friends"
            aria-label="Mes amis"
            aria-describedby="friends-alerts"
            title="Mes amis"
            onClick={() => navigate("amis")}
          >
            <Users size={24} />
            {!!p.friendCount && (
              <span className="social-badge">
                {p.friendCount > 9 ? "9+" : p.friendCount}
              </span>
            )}
          </button>
          <span id="friends-alerts" className="sr-only" aria-live="polite">
            {p.friendCount
              ? `${p.friendCount} demande${p.friendCount > 1 ? "s" : ""} ou invitation${p.friendCount > 1 ? "s" : ""} en attente`
              : "Aucune demande ni invitation en attente"}
          </span>
          <HomePortal onEnter={portal.enter} entering={portal.entering} />
        </div>
      </section>
    );
  return (
    <section className={`explore-screen screen-${screen}`}>
      {portal.transition}
      <button
        type="button"
        className="text-button screen-back"
        onClick={p.back}
      >
        <ChevronLeft size={18} />
        Retour
      </button>
      {(screen === "classement" || screen === "boutique") && (
        <>
          <div className="page-heading">
            <h1>{screen === "classement" ? "Classement" : "Boutique"}</h1>
          </div>
          <section className="future-feature">
            <ArcadeIcon name={screen === "classement" ? "podium" : "chest"} />
            <span className="coming-soon">À venir</span>
            <p>
              {screen === "classement"
                ? "Le classement des joueurs prendra place ici."
                : "La boutique ouvrira ses coffres dans une prochaine étape."}
            </p>
          </section>
        </>
      )}
      {(screen === "mode" || isFavorite) && (
        <>
          <div className="page-heading">
            {isFavorite && (
              <span className="eyebrow">
                {themeName(themeId).toUpperCase()} · FAVORI
              </span>
            )}
            <h1>Choisis ton mode</h1>
          </div>
          <div
            className="selection-grid"
            role="group"
            aria-label="Modes de jeu"
          >
            <SelectionCard
              label="Classique"
              accessibleLabel="Classique, duel 1 contre 1"
              onClick={() =>
                navigate(isFavorite ? themeRoute(themeId) : "classique")
              }
            >
              <img
                src="/art/classic-swords.png"
                width="64"
                height="64"
                alt=""
              />
            </SelectionCard>
            <SelectionCard
              label="Solo"
              accessibleLabel="Solo"
              onClick={() =>
                navigate(isFavorite ? themeRoute(themeId, "solo") : "solo")
              }
            >
              <PixelIcon name="profile" size={64} />
            </SelectionCard>
          </div>
        </>
      )}
      {(screen === "classique" || screen === "solo") && (
        <>
          <div className="page-heading">
            {screen === "solo" && (
              <span className="eyebrow">CLASSIQUE · SOLO</span>
            )}
            <h1>Choisis ton thème</h1>
          </div>
          <div
            className="selection-grid"
            role="group"
            aria-label="Thèmes disponibles"
          >
            {themes.map((theme) => (
              <div className="theme-selection" key={theme.id}>
                <SelectionCard
                  label={theme.name}
                  onClick={() =>
                    navigate(
                      themeRoute(theme.id, screen === "solo" ? "solo" : "duel"),
                    )
                  }
                >
                  <ThemeLogo themeId={theme.id} />
                </SelectionCard>
                <button
                  className="favorite-toggle"
                  aria-label={`${p.favorites.includes(theme.id) ? "Retirer" : "Ajouter"} ${theme.name} ${p.favorites.includes(theme.id) ? "des" : "aux"} favoris`}
                  aria-pressed={p.favorites.includes(theme.id)}
                  disabled={busy}
                  onClick={() => p.toggleFavorite(theme.id)}
                >
                  <Star
                    size={22}
                    fill={
                      p.favorites.includes(theme.id) ? "currentColor" : "none"
                    }
                    aria-hidden="true"
                  />
                </button>
              </div>
            ))}
            <FutureSelectionCard />
          </div>
          <p className="selection-note">
            L’étoile ajoute ce thème aux trois favoris de ton accueil.
          </p>
        </>
      )}
      {isThemeScreen(screen) && (
        <>
          <div className="match-theme-heading">
            <div className="page-heading">
              <span className="eyebrow">
                CLASSIQUE · {isSolo ? "SOLO" : "1 CONTRE 1"}
              </span>
              <h1>{themeName(themeId)}</h1>
            </div>
            <div className="duel-theme-logo">
              <ThemeLogo themeId={themeId} />
            </div>
          </div>
          <div className="duel-rules">
            <span>
              <b>10</b> questions
            </span>
            <span>
              <b>20 s</b> par question
            </span>
            <span>
              Jusqu’à <b>1 000</b> points par bonne réponse · moins tu attends,
              plus tu marques
            </span>
          </div>
          <div className="theme-actions">
            {p.difficultyPicker}
            <button
              className="button primary arcade-button"
              disabled={busy || !p.canStart}
              onClick={isSolo ? p.solo : p.create}
            >
              <PixelIcon name="swords" />
              {isSolo ? "Commencer en solo" : "Créer un duel"}
            </button>
            {!isSolo && (
              <button
                className="button secondary arcade-button"
                onClick={() => navigate("rejoindre")}
              >
                <PixelIcon name="ticket" />
                Rejoindre un ami
              </button>
            )}
          </div>
          {profile?.credentials && (
            <p className="player-connection">
              <span className={online ? "connection online" : "connection"}>
                {online ? "En ligne" : "Connexion en cours…"}
              </span>
              <span>{profile.credentials.name}</span>
            </p>
          )}
        </>
      )}
      {screen === "rejoindre" && (
        <>
          <div className="page-heading">
            <span className="eyebrow">INVITATION</span>
            <h1>Rejoindre un ami</h1>
            <p>Entre le code qu’il t’a partagé.</p>
          </div>
          <div className="invite-art" aria-hidden="true">
            <PixelIcon name="ticket" size={74} />
          </div>
          <form
            className="join-panel"
            onSubmit={(e) => {
              e.preventDefault();
              p.join();
            }}
          >
            <label htmlFor="code">Code du salon</label>
            <input
              id="code"
              className="code-input"
              placeholder="ABC123"
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={6}
              minLength={6}
              required
              value={p.code}
              onChange={(e) =>
                p.setCode(
                  e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""),
                )
              }
            />
            <button
              className="button primary arcade-button"
              disabled={busy || p.code.length !== 6}
            >
              Rejoindre
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="selection-note">
            Le code ouvre directement le salon de ton ami.
          </p>
        </>
      )}
      {screen === "profil" && (
        <>
          <div className="page-heading">
            <span className="eyebrow">TON ESPACE</span>
            <h1>Profil</h1>
          </div>
          <div className="profile-panel">
            <button
              className="profile-symbol profile-photo"
              aria-label="Modifier ma photo"
              onClick={p.editPhoto}
            >
              <PortraitFrame>
                {p.photo ? (
                  <img src={p.photo} alt="Ta photo de profil" />
                ) : (
                  <PixelIcon name="profile" size={42} />
                )}
              </PortraitFrame>
            </button>
            {profile?.credentials ? (
              <>
                <span className="eyebrow">TON PSEUDO</span>
                <h2>{p.accountName ?? profile.credentials.name}</h2>
                <p>
                  <Check size={15} />
                  {profile.credentials.account
                    ? "Compte sauvegardé"
                    : "Profil invité sur cet appareil"}
                </p>
              </>
            ) : (
              <>
                <h2>Ton pseudo</h2>
                <p>Choisis le nom affiché dans tes duels.</p>
                <button className="button primary" onClick={p.chooseName}>
                  Choisir mon pseudo
                </button>
              </>
            )}
          </div>
          {p.accountContent}
          <button className="profile-setting" onClick={p.settings}>
            <Settings2 size={21} />
            <span>
              Connexion au serveur
              <small>
                {online
                  ? "Connecté"
                  : profile?.credentials
                    ? "Connexion en cours"
                    : "À la première partie"}
              </small>
            </span>
            <ArrowRight size={18} />
          </button>
          <p className="version-label">AKASHA · VERSION 0.7</p>
        </>
      )}
    </section>
  );
}
