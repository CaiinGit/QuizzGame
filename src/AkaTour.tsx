import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { AkaRig, AKA_PARTS, akaPartUrl } from "./AkaRig";
export const akaSteps = [
  {
    title: "Salut, moi c’est Aka !",
    text: "Bienvenue dans Akasha ! Viens, je te montre l’essentiel.",
    targets: [".portal-target"],
  },
  {
    title: "Le portail de jeu",
    text: "Entre ici : Classique pour un duel, Solo pour t’entraîner !",
    targets: [".portal-target"],
  },
  {
    title: "Tes univers préférés",
    text: "Mets une étoile à tes thèmes préférés pour les retrouver sur l’accueil.",
    targets: [".bottom-nav button:nth-child(3)"],
  },
  {
    title: "Retrouve tes amis",
    text: "Ici, retrouve tes amis et invite-les en duel !",
    targets: [".home-friends"],
  },
  {
    title: "C’est ton profil",
    text: "Ta photo, ton niveau, tes statistiques : tout est ici !",
    targets: [".header-photo"],
  },
  {
    title: "À ta façon",
    text: "Apparence, sons ou revoir ma visite : c’est ici. À toi de jouer !",
    targets: ['.header-tools [aria-label="Réglages"]'],
  },
];

type Box = { x: number; y: number; width: number; height: number };
type Placement = {
  target: Box;
  portal: Box | null;
  x: number;
  y: number;
  actorX: number;
  actorY: number;
  size: number;
  above: boolean;
  pointer: number;
};
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));
const rect = (selector: string): Box | null => {
  const box = document.querySelector(selector)?.getBoundingClientRect();
  return box
    ? {
        x: box.x - 5,
        y: box.y - 5,
        width: box.width + 10,
        height: box.height + 10,
      }
    : null;
};

export function AkaTour({
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
  const bubble = useRef<HTMLDivElement>(null);
  const flight = useRef<HTMLDivElement>(null);
  const mask = useId().replaceAll(":", "");
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const item = akaSteps[step];
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    preference.addEventListener("change", update);
    let alive = true;
    const images: HTMLImageElement[] = [];
    void Promise.all(
      AKA_PARTS.map(
        (name) =>
          new Promise<void>((resolve, reject) => {
            const image = new Image();
            images.push(image);
            image.onload = () => resolve();
            image.onerror = () => reject(Error("Aka artwork unavailable"));
            image.src = akaPartUrl(name);
          }),
      ),
    )
      .then(() => {
        if (alive) setImageReady(true);
      })
      .catch(() => {
        if (alive) {
          setFallback(true);
          setImageReady(true);
        }
      });
    return () => {
      preference.removeEventListener("change", update);
      alive = false;
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, []);
  useLayoutEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);
  useLayoutEffect(() => {
    const update = () => {
      if (!bubble.current) return;
      const target = rect(item.targets[0]);
      if (!target) return;
      const { width, height } = bubble.current.getBoundingClientRect();
      const size = innerHeight <= 650 ? 96 : 120;
      const total = height + size - 8;
      const above =
        target.y >= total + 28 ||
        target.y > innerHeight - target.y - target.height;
      const x = clamp(
        target.x + target.width / 2 - width / 2,
        14,
        innerWidth - width - 14,
      );
      const top = clamp(
        above ? target.y - total - 14 : target.y + target.height + 14,
        14,
        innerHeight - total - 18,
      );
      const actorX = clamp(
        target.x + target.width / 2 - size / 2,
        x + 4,
        x + width - size - 4,
      );
      const y = above ? top : top + size - 8;
      const actorY = above ? top + height - 8 : top;
      const value = {
        target,
        portal: rect(".portal-target"),
        x,
        y,
        actorX,
        actorY,
        size,
        above,
        pointer: actorX + size / 2 - x,
      };
      setPlacement((previous) =>
        JSON.stringify(previous) === JSON.stringify(value) ? previous : value,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bubble.current!);
    const shell = document.querySelector(".app-shell");
    if (shell) observer.observe(shell);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step, item]);
  useLayoutEffect(() => {
    if (arrived || !imageReady || !placement || !flight.current) return;
    if (reduced || step !== 0 || !placement.portal) {
      setArrived(true);
      return;
    }
    const { portal, actorX, actorY, size } = placement;
    const x = portal.x + portal.width / 2 - actorX - size / 2;
    const y = portal.y + portal.height / 2 - actorY - size / 2;
    const animation = flight.current.animate(
      [
        { transform: `translate(${x}px,${y}px) scale(.12)`, opacity: 0 },
        {
          offset: 0.25,
          transform: `translate(${x}px,${y - 8}px) scale(.68)`,
          opacity: 1,
        },
        {
          offset: 0.7,
          transform: "translate(0,-8px) scale(1.06)",
          opacity: 1,
        },
        { offset: 0.87, transform: "translate(0,3px) scale(.99)", opacity: 1 },
        { transform: "translate(0,0) scale(1)", opacity: 1 },
      ],
      { duration: 1350, easing: "cubic-bezier(.22,.65,.3,1)", fill: "both" },
    );
    let alive = true;
    void animation.finished
      .then(() => {
        if (alive) setArrived(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
      animation.cancel();
    };
  }, [placement, imageReady, arrived, reduced, step]);
  const ready = imageReady && !!placement;
  const arriving = ready && !arrived && !reduced && step === 0;
  const portal = placement?.portal;
  return (
    <dialog
      ref={dialog}
      className={`aka-tour ${!arrived ? "aka-preparing" : ""} ${arriving ? "aka-entering" : ""}`}
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
            {placement && <rect {...placement.target} rx="9" fill="black" />}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="#080d14"
          fillOpacity=".62"
          mask={`url(#${mask})`}
        />
        {placement && (
          <rect
            {...placement.target}
            rx="9"
            fill="none"
            stroke="var(--green)"
            strokeWidth="3"
          />
        )}
      </svg>
      {arriving && portal && (
        <div
          className="aka-portal-burst"
          aria-hidden="true"
          style={{
            left: portal.x,
            top: portal.y,
            width: portal.width,
            height: portal.height,
          }}
        >
          <span className="aka-portal-glow" />
          {Array.from({ length: 8 }, (_, i) => (
            <i
              key={i}
              style={
                {
                  "--spark-x": `${Math.cos((i * Math.PI) / 4) * 65}px`,
                  "--spark-y": `${Math.sin((i * Math.PI) / 4) * 70}px`,
                  "--spark-delay": `${i * 35}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      <section
        className={`aka-guide ${placement?.above ? "aka-guide-above" : ""}`}
        style={
          {
            transform: `translate(${placement?.x ?? 14}px,${placement?.y ?? 140}px)`,
            visibility: placement ? "visible" : "hidden",
            "--pointer-x": `${placement?.pointer ?? 60}px`,
          } as CSSProperties
        }
      >
        <div ref={bubble} className="aka-bubble">
          <div className="aka-caption">
            <strong>Aka</strong>
            <span>
              {step + 1} / {akaSteps.length}
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
            <button type="button" className="aka-next" autoFocus onClick={next}>
              {step === 0
                ? "Découvrir"
                : step === akaSteps.length - 1
                  ? "À moi de jouer !"
                  : "Suivant"}
            </button>
          </div>
        </div>
      </section>
      <div
        className="aka-actor"
        style={{
          width: placement?.size,
          height: placement?.size,
          transform: `translate(${placement?.actorX ?? 0}px,${placement?.actorY ?? 0}px)`,
          visibility: ready ? "visible" : "hidden",
        }}
      >
        <div ref={flight} className="aka-flight">
          <div className={`aka-float ${arriving ? "aka-wait" : ""}`}>
            {fallback ? (
              <div
                className="aka-sprite aka-sprite-fallback"
                role="img"
                aria-label="Aka, le petit esprit ailé qui te guide"
              />
            ) : (
              <AkaRig
                step={step}
                reduced={reduced}
                arriving={!arrived}
                look={
                  placement
                    ? {
                        x: clamp(
                          (placement.target.x +
                            placement.target.width / 2 -
                            placement.actorX -
                            placement.size * 0.5) /
                            placement.size,
                          -1,
                          1,
                        ),
                        y: clamp(
                          (placement.target.y +
                            placement.target.height / 2 -
                            placement.actorY -
                            placement.size * 0.36) /
                            placement.size,
                          -1,
                          1,
                        ),
                      }
                    : { x: 0, y: 0 }
                }
              />
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
