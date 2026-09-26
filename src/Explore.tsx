import { ChevronLeft, ArrowRight, Check, Settings2 } from "lucide-react";
import { PixelIcon, type IconName } from "./PixelIcon";
import type { Screen } from "./navigation";
import type { Profile } from "./client";

type Props = {
  screen: Screen;
  navigate: (screen: Screen) => void;
  back: () => void;
  profile: Profile | null;
  online: boolean;
  busy: boolean;
  code: string;
  setCode: (code: string) => void;
  create: () => void;
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
  const active =
    screen === "profil"
      ? "profil"
      : ["mode", "classique", "one-piece"].includes(screen)
        ? "mode"
        : "accueil";
  const items: { screen: Screen; label: string; icon: IconName }[] = [
    { screen: "mode", label: "Mode", icon: "swords" },
    { screen: "accueil", label: "Accueil", icon: "portal" },
    { screen: "profil", label: "Profil", icon: "profile" },
  ];
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
            <PixelIcon name={item.icon} />
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
        <div className="portal-stage">
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
        </div>
        <div className="home-actions">
          <button
            className="button primary arcade-button"
            onClick={() => navigate("mode")}
          >
            <PixelIcon name="compass" />
            Choisir un mode
          </button>
          <button
            className="button secondary arcade-button"
            onClick={() => navigate("rejoindre")}
          >
            <PixelIcon name="ticket" />
            Rejoindre un ami
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
      {screen === "mode" && (
        <>
          <div className="page-heading">
            <span className="eyebrow">LES MODES DE JEU</span>
            <h1>Choisis ton mode</h1>
          </div>
          <button
            className="mode-card"
            onClick={() => navigate("classique")}
            aria-label="Classique, duel 1 contre 1"
          >
            <div className="mode-art" aria-hidden="true">
              <div className="mode-ring" />
              <PixelIcon name="swords" size={82} />
              <span className="mode-mark left">✦</span>
              <span className="mode-mark right">✦</span>
            </div>
            <div className="mode-card-body">
              <span className="eyebrow">1 CONTRE 1</span>
              <h2>Classique</h2>
              <p>Un duel entre amis, sur le thème de votre choix.</p>
              <div className="mode-card-bottom">
                <span>10 questions · 20 s par question</span>
                <ArrowRight size={20} />
              </div>
            </div>
          </button>
          <p className="selection-note">
            Même question. Même temps. À vous de jouer.
          </p>
        </>
      )}
      {screen === "classique" && (
        <>
          <div className="page-heading">
            <span className="eyebrow">CLASSIQUE · 1 CONTRE 1</span>
            <h1>Choisis ton thème</h1>
          </div>
          <button
            className="island-card"
            aria-label="One Piece"
            onClick={() => navigate("one-piece")}
          >
            <img
              src="/art/one-piece-island.webp"
              width="800"
              height="600"
              alt="Île en pixel art avec un phare, entourée d’une mer vert sauge"
            />
            <div className="island-caption">
              <span className="eyebrow">GRAND LINE</span>
              <h2>One Piece</h2>
              <span>
                Explorer ce thème
                <ArrowRight size={17} />
              </span>
            </div>
          </button>
        </>
      )}
      {screen === "one-piece" && (
        <>
          <div className="page-heading">
            <span className="eyebrow">CLASSIQUE · 1 CONTRE 1</span>
            <h1>One Piece</h1>
          </div>
          <div className="duel-theme-art">
            <img
              src="/art/one-piece-island.webp"
              width="800"
              height="600"
              alt="L’île et le phare du thème One Piece"
            />
          </div>
          <div className="duel-rules">
            <span>
              <b>10</b> questions
            </span>
            <span>
              <b>20 s</b> par question
            </span>
            <span>
              <b>1 000</b> points par bonne réponse
            </span>
          </div>
          <div className="theme-actions">
            <button
              className="button primary arcade-button"
              disabled={busy}
              onClick={p.create}
            >
              <PixelIcon name="swords" />
              Créer un duel
            </button>
            <button
              className="button secondary arcade-button"
              onClick={() => navigate("rejoindre")}
            >
              <PixelIcon name="ticket" />
              Rejoindre un ami
            </button>
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
            <div className="profile-symbol" aria-hidden="true">
              <PixelIcon name="profile" size={42} />
            </div>
            {profile?.credentials ? (
              <>
                <span className="eyebrow">TON PSEUDO</span>
                <h2>{profile.credentials.name}</h2>
                <p>
                  <Check size={15} />
                  Enregistré sur ce téléphone
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
          <p className="version-label">AKASHA · VERSION 0.3</p>
        </>
      )}
    </section>
  );
}
