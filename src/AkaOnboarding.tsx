import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Preferences } from "@capacitor/preferences";
import { accountApi, type Profile } from "./client";
import type { AccountProfile } from "../shared/account";
import "./aka-onboarding.css";

const steps = [
  {
    title: "Salut, moi c’est Aka !",
    text: "Bienvenue dans Akasha ! Je veille sur ce portail. Viens, je te montre où trouver l’essentiel.",
    targets: [".portal-target"],
  },
  {
    title: "Le portail de jeu",
    text: "Touche le cœur lumineux du portail pour choisir ton mode : Classique pour un duel, ou Solo pour t’entraîner.",
    targets: [".portal-target"],
  },
  {
    title: "Tes univers préférés",
    text: "Dans Thèmes, ajoute une étoile à tes univers préférés. Tu les retrouveras dans les trois cases sur l’accueil.",
    targets: [".bottom-nav button:nth-child(3)"],
  },
  {
    title: "Retrouve tes amis",
    text: "Ce petit bouton ouvre ta liste d’amis. Ajoute-les et invite-les à te rejoindre pour un duel !",
    targets: [".home-friends"],
  },
  {
    title: "C’est ton profil",
    text: "Touche ta photo pour personnaliser ton profil et retrouver ta progression.",
    targets: [".header-photo"],
  },
  {
    title: "À ta façon",
    text: "Change l’apparence, règle les sons et retrouve cette visite dans les réglages. Le portail t’attend !",
    targets: ['.header-tools [aria-label="Réglages"]'],
  },
];

export function AkaOnboarding({
  profile,
  account,
  enabled,
  online,
  replay,
  onCompleted,
}: {
  profile: Profile;
  account: AccountProfile | null;
  enabled: boolean;
  online: boolean;
  replay: number;
  onCompleted: (id: string) => void;
}) {
  const owner = `${profile.server}:${account?.id ?? "guest"}`;
  const key = `akasha.aka-tour.v1:${owner}`;
  const [checked, setChecked] = useState<{
    owner: string;
    seen: boolean;
  } | null>(null);
  const [activeOwner, setActiveOwner] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const handledReplay = useRef(replay);
  const finishedOwners = useRef(new Set<string>());
  const completed = useRef(onCompleted);
  useEffect(() => {
    completed.current = onCompleted;
  }, [onCompleted]);
  useEffect(() => {
    let alive = true;
    void Preferences.get({ key })
      .then(({ value }) => {
        if (alive)
          setChecked({
            owner,
            seen: value === "1" || finishedOwners.current.has(owner),
          });
      })
      .catch(() => {
        if (alive)
          setChecked({ owner, seen: finishedOwners.current.has(owner) });
      });
    return () => {
      alive = false;
    };
  }, [key, owner]);
  useEffect(() => {
    if (!enabled) return;
    const requested = replay !== handledReplay.current;
    // A portal transition owns its native modal until navigation completes.
    if (document.querySelector(".portal-entry[open]")) return;
    if (
      requested ||
      (account &&
        !account.onboardingCompleted &&
        checked?.owner === owner &&
        !checked.seen)
    ) {
      if (requested || activeOwner !== owner) {
        setStep(0);
        setActiveOwner(owner);
      }
      handledReplay.current = replay;
    }
  }, [
    enabled,
    replay,
    account?.onboardingCompleted,
    account?.id,
    checked,
    owner,
    activeOwner,
  ]);
  useEffect(() => {
    if (
      !account ||
      account.onboardingCompleted ||
      !online ||
      checked?.owner !== owner ||
      !checked.seen
    )
      return;
    let alive = true;
    void accountApi(profile, "onboarding/complete", {})
      .then(() => {
        if (alive) completed.current(account.id);
      })
      .catch(() => {}); // The local marker retries on the next connection.
    return () => {
      alive = false;
    };
  }, [
    account?.id,
    account?.onboardingCompleted,
    online,
    checked,
    owner,
    profile.server,
    profile.credentials?.token,
  ]);
  function finish() {
    finishedOwners.current.add(owner);
    setActiveOwner(null);
    setChecked({ owner, seen: true });
    void Preferences.set({ key, value: "1" }).catch(() => {});
  }
  useEffect(() => {
    if (!enabled || activeOwner !== owner) return;
    const skip = () => finish();
    window.addEventListener("akasha:skip-tour", skip);
    return () => window.removeEventListener("akasha:skip-tour", skip);
  }, [enabled, activeOwner, owner, key]);
  if (!enabled || activeOwner !== owner) return null;
  return createPortal(
    <AkaTour
      step={step}
      next={() => (step === steps.length - 1 ? finish() : setStep(step + 1))}
      back={() => setStep(Math.max(0, step - 1))}
      skip={finish}
    />,
    document.body,
  );
}

type Box = { x: number; y: number; width: number; height: number };
function AkaTour({
  step,
  next,
  back,
  skip,
}: {
  step: number;
  next: () => void;
  back: () => void;
  skip: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const mascot = useRef<HTMLImageElement>(null);
  const mask = useId().replaceAll(":", "");
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [above, setAbove] = useState(false);
  const [flight, setFlight] = useState<CSSProperties | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const item = steps[step];
  useLayoutEffect(() => {
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
    };
  }, []);
  useLayoutEffect(() => {
    const update = () => {
      const targets = item.targets.flatMap((selector) => {
        const node = document.querySelector(selector);
        if (!node) return [];
        const r = node.getBoundingClientRect();
        return [
          {
            x: r.x - 5,
            y: r.y - 5,
            width: r.width + 10,
            height: r.height + 10,
          },
        ];
      });
      setBoxes(targets);
      setAbove(targets.some((r) => r.y + r.height / 2 > innerHeight * 0.56));
    };
    update();
    const resize = new ResizeObserver(update);
    const shell = document.querySelector(".app-shell");
    if (shell) resize.observe(shell);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      resize.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step]);
  useLayoutEffect(() => {
    if (step !== 0 || flight || !boxes.length || !mascot.current) return;
    const portal = document
      .querySelector(".portal-target")
      ?.getBoundingClientRect();
    const end = mascot.current.getBoundingClientRect();
    if (portal)
      setFlight({
        "--aka-from-x": `${portal.x + portal.width / 2 - end.x - end.width / 2}px`,
        "--aka-from-y": `${portal.y + portal.height / 2 - end.y - end.height / 2}px`,
      } as CSSProperties);
  }, [above, boxes, step, flight]);
  return (
    <dialog
      ref={dialog}
      className="aka-tour"
      aria-label="Visite guidée avec Aka"
      onCancel={(event) => {
        event.preventDefault();
        skip();
      }}
    >
      <svg
        className="aka-spotlight"
        aria-hidden="true"
        width="100%"
        height="100%"
      >
        <defs>
          <mask id={mask}>
            <rect width="100%" height="100%" fill="white" />
            {boxes.map((b, i) => (
              <rect key={i} {...b} rx="9" fill="black" />
            ))}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="#080d14"
          fillOpacity=".66"
          mask={`url(#${mask})`}
        />
        {boxes.map((b, i) => (
          <rect
            key={i}
            {...b}
            rx="9"
            fill="none"
            stroke="var(--green)"
            strokeWidth="3"
          />
        ))}
      </svg>
      <section className={`aka-guide ${above ? "aka-guide-above" : ""}`}>
        <img
          ref={mascot}
          onLoad={() => setImageReady(true)}
          className={`aka-mascot ${step === 0 && flight && imageReady ? "aka-arriving" : ""}`}
          style={{ ...flight, visibility: imageReady ? "visible" : "hidden" }}
          src="/art/aka-v1.webp"
          width="132"
          height="132"
          alt="Aka, le petit esprit ailé qui te guide"
        />
        <div className="aka-bubble">
          <div className="aka-caption">
            <strong>Aka</strong>
            <span>
              {step + 1} / {steps.length}
            </span>
          </div>
          <div aria-live="polite" aria-atomic="true">
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </div>
          <div className="aka-controls">
            <button type="button" className="aka-skip" onClick={skip}>
              Passer la visite
            </button>
            {step > 0 && (
              <button
                type="button"
                className="aka-back"
                aria-label="Étape précédente"
                onClick={back}
              >
                ‹
              </button>
            )}
            <button type="button" className="aka-next" onClick={next}>
              {step === 0
                ? "Découvrir"
                : step === steps.length - 1
                  ? "À moi de jouer !"
                  : "Suivant"}
            </button>
          </div>
        </div>
      </section>
    </dialog>
  );
}
