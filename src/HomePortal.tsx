import { useId, type CSSProperties } from "react";
import "./home-portal.css";

export function HomePortal() {
  const id = useId().replaceAll(":", "");
  const clip = `${id}-opening`;
  const depth = `${id}-depth`;
  const wave = `${id}-wave`;
  return (
    <svg
      className="portal-art akasha-portal"
      viewBox="0 0 600 800"
      role="img"
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
    </svg>
  );
}
