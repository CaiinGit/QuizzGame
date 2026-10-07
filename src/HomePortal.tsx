import {
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";
import { createPortal, flushSync } from "react-dom";
import type { Screen } from "./navigation";
import "./home-portal.css";

type Entry = {
  snapshot: boolean;
  camera: {
    root: HTMLElement;
    originX: number;
    originY: number;
    shiftX: number;
    shiftY: number;
  };
  phase: "enter" | "reveal";
};

// Owned by Explore, so the light stays mounted when home becomes mode selection.
export function usePortalEntry(
  screen: Screen,
  onEnter: () => void,
  onCancel: () => void,
) {
  const started = useRef(false);
  const navigate = useRef(onEnter);
  const [entry, setEntry] = useState<Entry | null>(null);
  useEffect(() => {
    navigate.current = onEnter;
  }, [onEnter]);
  useEffect(() => {
    if (!entry) started.current = false;
    else if (
      screen !== "accueil" &&
      !(screen === "mode" && entry.phase === "reveal")
    ) {
      setEntry(null);
    }
  }, [entry, screen]);

  function enter(art: SVGSVGElement) {
    if (started.current) return;
    const root = art.closest<HTMLElement>(".app-shell");
    if (!root) {
      navigate.current();
      return;
    }
    started.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate.current();
      return;
    }
    // Match the SVG's contained 3:4 artwork, excluding its letterboxed margins.
    const bounds = art.getBoundingClientRect();
    const scale = Math.min(bounds.width / 600, bounds.height / 800);
    const width = 600 * scale,
      height = 800 * scale;
    const left = bounds.left + (bounds.width - width) / 2;
    const top = bounds.top + (bounds.height - height) / 2;
    const rootBounds = root.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + 430 * scale;
    setEntry({
      snapshot: typeof document.startViewTransition === "function",
      phase: "enter",
      camera: {
        root,
        originX: centerX - rootBounds.left,
        originY: centerY - rootBounds.top,
        shiftX: innerWidth / 2 - centerX,
        shiftY: innerHeight / 2 - centerY,
      },
    });
  }

  return {
    enter,
    entering: !!entry,
    transition:
      entry &&
      createPortal(
        <PortalEntry
          entry={entry}
          onCovered={() => {
            setEntry((current) => current && { ...current, phase: "reveal" });
            navigate.current();
          }}
          onDone={() => setEntry(null)}
          onCancel={() => {
            setEntry(null);
            onCancel();
          }}
        />,
        document.body,
      ),
  };
}

function PortalEntry({
  entry,
  onCovered,
  onDone,
  onCancel,
}: {
  entry: Entry;
  onCovered: () => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const covered = useRef(false);
  const done = useRef(false);
  const snapshot = useRef<ViewTransition | null>(null);
  const actions = useRef({ onCovered, onDone, onCancel });
  useLayoutEffect(() => {
    actions.current = { onCovered, onDone, onCancel };
  });
  useLayoutEffect(() => {
    dialog.current?.showModal();
  }, []);
  useLayoutEffect(() => {
    if (!entry.snapshot) return;
    const html = document.documentElement;
    const { root, originX, originY, shiftX, shiftY } = entry.camera;
    const bounds = root.getBoundingClientRect();
    const properties = {
      "--portal-camera-origin": `${bounds.left + originX}px ${bounds.top + originY}px`,
      "--portal-camera-x": `${shiftX}px`,
      "--portal-camera-y": `${shiftY}px`,
    };
    const previous = Object.keys(properties).map((name) => [
      name,
      html.style.getPropertyValue(name),
    ]);
    Object.entries(properties).forEach(([name, value]) =>
      html.style.setProperty(name, value),
    );
    html.classList.add("portal-snapshot-active");
    root.classList.add("portal-camera-frozen");
    let active = true;
    const start = requestAnimationFrame(() => {
      try {
        const transition = document.startViewTransition(() => {
          if (!active || done.current) return;
          // Capture the mode screen in the same render, beneath the native snapshot.
          flushSync(cover);
        });
        snapshot.current = transition;
        void transition.ready.catch(() => {});
        void transition.finished.then(
          () => {
            if (active) finish();
          },
          () => {
            if (active) finish();
          },
        );
      } catch {
        cover();
        finish();
      }
    });
    return () => {
      active = false;
      cancelAnimationFrame(start);
      snapshot.current?.skipTransition();
      snapshot.current = null;
      root.classList.remove("portal-camera-frozen");
      html.classList.remove("portal-snapshot-active");
      previous.forEach(([name, value]) => {
        if (value) html.style.setProperty(name, value);
        else html.style.removeProperty(name);
      });
    };
  }, [entry.camera, entry.snapshot]);
  useLayoutEffect(() => {
    if (entry.snapshot || entry.phase !== "enter") return;
    const { root, originX, originY, shiftX, shiftY } = entry.camera;
    const nav = root.querySelector<HTMLElement>(".bottom-nav");
    const rootBounds = root.getBoundingClientRect();
    const navBounds = nav?.getBoundingClientRect();
    const rootStyle = root.style.cssText;
    const navStyle = nav?.style.cssText;
    const overflow = document.documentElement.style.overflow;
    // Pin the fixed navigation at its current position before its containing
    // block becomes the transformed app. All home elements then share one camera.
    root.style.position = "relative";
    if (nav && navBounds)
      Object.assign(nav.style, {
        position: "absolute",
        left: `${navBounds.left - rootBounds.left - root.clientLeft}px`,
        top: `${navBounds.top - rootBounds.top - root.clientTop}px`,
        right: "auto",
        bottom: "auto",
        width: `${navBounds.width}px`,
        height: `${navBounds.height}px`,
        transform: "none",
      });
    document.documentElement.style.overflow = "clip";
    root.classList.add("portal-camera");
    root.style.transformOrigin = `${originX}px ${originY}px`;
    root.style.willChange = "transform";
    const animation = root.animate(
      [
        { transform: "translate(0, 0) scale(1)" },
        { transform: `translate(${shiftX}px, ${shiftY}px) scale(2)` },
      ],
      {
        duration: 650,
        easing: "cubic-bezier(0.3, 0, 0.2, 1)",
        fill: "forwards",
      },
    );
    return () => {
      animation.cancel();
      root.classList.remove("portal-camera");
      root.style.cssText = rootStyle;
      if (nav && navStyle !== undefined) nav.style.cssText = navStyle;
      document.documentElement.style.overflow = overflow;
    };
  }, [entry.camera, entry.phase, entry.snapshot]);
  function cover() {
    if (covered.current || done.current) return;
    covered.current = true;
    actions.current.onCovered();
  }
  function finish() {
    if (done.current) return;
    done.current = true;
    dialog.current?.close();
    actions.current.onDone();
    if (covered.current) {
      const heading = document.querySelector<HTMLElement>(".screen-mode h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
    }
  }
  useEffect(() => {
    if (entry.snapshot) return;
    // Safety net if a browser suppresses an animation event (e.g. background tab).
    const timer = window.setTimeout(
      entry.phase === "enter" ? cover : finish,
      entry.phase === "enter" ? 1100 : 650,
    );
    return () => window.clearTimeout(timer);
  }, [entry.phase, entry.snapshot]);
  return (
    <dialog
      ref={dialog}
      className={`portal-entry ${entry.snapshot ? "uses-snapshot" : ""} ${entry.phase === "reveal" ? "is-revealing" : ""}`}
      aria-label="Entrée dans le portail"
      onCancel={() => {
        done.current = true;
        snapshot.current?.skipTransition();
        dialog.current?.close();
        actions.current.onCancel();
      }}
    >
      <div
        className="portal-entry-light"
        aria-hidden="true"
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.animationName === "portal-entry-cover") cover();
          if (event.animationName === "portal-entry-reveal") finish();
        }}
      />
      <span className="sr-only">Ouverture du choix des modes…</span>
    </dialog>
  );
}

export function HomePortal({
  onEnter,
  entering,
}: {
  onEnter: (art: SVGSVGElement) => void;
  entering: boolean;
}) {
  const art = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const icon = new Image();
    icon.src = "/art/classic-swords.png";
    void icon.decode().catch(() => {});
  }, []);
  return (
    <PortalArtwork
      artRef={art}
      onEnter={() => {
        if (art.current) onEnter(art.current);
      }}
      entering={entering}
    />
  );
}

function PortalArtwork({
  artRef,
  onEnter,
  entering = false,
}: {
  artRef?: Ref<SVGSVGElement>;
  onEnter?: () => void;
  entering?: boolean;
}) {
  const id = useId().replaceAll(":", "");
  const clip = `${id}-opening`;
  const depth = `${id}-depth`;
  const wave = `${id}-wave`;
  return (
    <svg
      ref={artRef}
      className="portal-art akasha-portal"
      viewBox="0 0 600 800"
      role="group"
      aria-label="Portail magique d’Akasha"
      focusable="false"
    >
      <defs>
        <clipPath id={clip}>
          <path d="M300 145C205 145 130 227 130 320V711H470V320C470 227 395 145 300 145Z" />
        </clipPath>
        <radialGradient id={depth} cx="50%" cy="48%" r="65%">
          <stop offset="0" stopColor="var(--portal-bright)" />
          <stop offset=".36" stopColor="var(--portal-energy)" />
          <stop offset=".72" stopColor="var(--portal-deep)" />
          <stop offset="1" stopColor="var(--portal-ink)" />
        </radialGradient>
        <linearGradient id={wave}>
          <stop stopColor="var(--portal-bright)" stopOpacity=".8" />
          <stop
            offset=".45"
            stopColor="var(--portal-energy)"
            stopOpacity=".08"
          />
          <stop offset="1" stopColor="var(--portal-bright)" stopOpacity=".5" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect
          x="125"
          y="140"
          width="350"
          height="580"
          fill={`url(#${depth})`}
        />
        <g className="portal-current" fill="none" stroke={`url(#${wave})`}>
          <ellipse cx="300" cy="430" rx="170" ry="285" strokeWidth="42" />
          <ellipse cx="300" cy="430" rx="104" ry="212" strokeWidth="18" />
        </g>
        {[0, 1, 2].map((i) => (
          <ellipse
            key={i}
            className="portal-wave"
            cx="300"
            cy="430"
            rx="115"
            ry="215"
            style={{ animationDelay: `${-i * 2}s` }}
          />
        ))}
        <ellipse
          className="portal-orbit"
          cx="300"
          cy="430"
          rx="95"
          ry="180"
          fill="none"
          stroke="var(--portal-bright)"
          strokeWidth="3"
          strokeDasharray="8 30 3 54"
          opacity=".6"
        />
        {Array.from({ length: 16 }, (_, i) => (
          <rect
            key={i}
            className="portal-mote"
            x={165 + ((i * 71) % 265)}
            y={325 + ((i * 41) % 340)}
            width={i % 4 === 0 ? 6 : 3}
            height={i % 4 === 0 ? 6 : 3}
            style={
              {
                "--drift": `${((i % 3) - 1) * 18}px`,
                animationDelay: `${i * -0.57}s`,
                animationDuration: `${5 + (i % 4)}s`,
              } as CSSProperties
            }
          />
        ))}
        <path
          className="portal-heart"
          d="M300 383L309 421L337 430L309 439L300 477L291 439L263 430L291 421Z"
        />
      </g>
      <image
        className="portal-stone"
        href="/art/portal-frame-v2.webp"
        width="600"
        height="800"
      />
      <g className="portal-runes" fill="var(--portal-bright)">
        <path d="M300 58L315 72L300 87L285 72Z" />
        <path d="M76 474L84 488L76 502L68 488Z" />
        <path d="M524 474L532 488L524 502L516 488Z" />
      </g>
      {Array.from({ length: 6 }, (_, i) => (
        <rect
          key={i}
          className="portal-ember"
          x={i % 2 ? 535 + i * 3 : 48 - i * 3}
          y={250 + i * 67}
          width="5"
          height="5"
          style={{ animationDelay: `${i * -0.8}s` }}
        />
      ))}
      {onEnter && (
        <foreignObject
          x="150"
          y="175"
          width="300"
          height="515"
          className="portal-target"
        >
          <button
            type="button"
            className="portal-enter"
            aria-label="Jouer"
            disabled={entering}
            onClick={onEnter}
          >
            <span>JOUER</span>
          </button>
        </foreignObject>
      )}
    </svg>
  );
}
