import { ChevronLeft, ArrowRight, Check, Settings2, Users } from "lucide-react";
import type { ReactNode } from "react";
import { PixelIcon } from "./PixelIcon";
import { ArcadeIcon, PortraitFrame } from "./ArcadeArt";
import {
  SelectionCard,
  FutureSelectionCard,
  OnePieceLogo,
} from "./SelectionCard";
import type { Screen } from "./navigation";
import type { Profile } from "./client";

type Props = {
  accountContent?: ReactNode;
  accountName?: string;
  friendCount?: number;
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
  const active = ["one-piece", "rejoindre", "solo", "solo-one-piece"].includes(
    screen,
  )
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
  if (screen === "accueil")
    return (
      <section className="home-screen" aria-label="Accueil Akasha">
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
            {[1, 2, 3].map((slot) => (
              <button
                key={slot}
                className="home-tile favorite-slot"
                aria-label={`Thème favori ${slot}, emplacement vide`}
                onClick={() => p.openShortcut("favorites")}
              />
            ))}
          </div>
        </div>
        <div className="portal-stage">
          <button
            type="button"
            className="home-friends"
            aria-label="Mes amis"
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
          <img
            className="portal-art"
            src="/art/portal.webp"
            width="600"
            height="800"
            alt="Portail ancien de face, illuminé de vert et couvert de lierre"
            fetchPriority="high"
          />
          <div className="portal-sparks" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <button
            type="button"
            className="home-tile home-play"
            aria-label="Jouer"
            onClick={() => navigate("mode")}
          >
            <span className="play-symbol" aria-hidden="true">
              <svg
                className="play-symbol-image"
                viewBox="24 18 28 28"
                width="56"
                height="56"
              >
                <image href="/art/play-light.png" width="64" height="64" />
              </svg>
            </span>
            <span className="play-label">JOUER</span>
            <span className="play-arrow" aria-hidden="true">
              ›
            </span>
          </button>
        </div>
      </section>
    );
  return (
    <section className={`explore-screen screen-${screen}`}>
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
      {screen === "mode" && (
        <>
          <div className="page-heading">
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
              onClick={() => navigate("classique")}
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
              onClick={() => navigate("solo")}
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
            <SelectionCard
              label="One Piece"
              onClick={() =>
                navigate(screen === "solo" ? "solo-one-piece" : "one-piece")
              }
            >
              <OnePieceLogo />
            </SelectionCard>
            <FutureSelectionCard />
          </div>
        </>
      )}
      {(screen === "one-piece" || screen === "solo-one-piece") && (
        <>
          <div className="page-heading">
            <span className="eyebrow">
              CLASSIQUE · {screen === "solo-one-piece" ? "SOLO" : "1 CONTRE 1"}
            </span>
            <h1>One Piece</h1>
          </div>
          <div className="duel-theme-logo">
            <OnePieceLogo />
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
            <button
              className="button primary arcade-button"
              disabled={busy}
              onClick={screen === "solo-one-piece" ? p.solo : p.create}
            >
              <PixelIcon name="swords" />
              {screen === "solo-one-piece"
                ? "Commencer en solo"
                : "Créer un duel"}
            </button>
            {screen !== "solo-one-piece" && (
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
          <p className="version-label">AKASHA · VERSION 0.5</p>
        </>
      )}
    </section>
  );
}
