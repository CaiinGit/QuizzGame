export default function Artwork() {
  return (
    <svg
      className="world-art"
      viewBox="0 0 620 440"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#34584d" />
          <stop offset="1" stopColor="#1c332b" />
        </linearGradient>
        <linearGradient id="rock" x2="0.6" y2="1">
          <stop stopColor="#52675a" />
          <stop offset="1" stopColor="#182c26" />
        </linearGradient>
        <linearGradient id="gate" x2="0" y2="1">
          <stop stopColor="#f1ecc1" />
          <stop offset="1" stopColor="#91bd7b" stopOpacity=".15" />
        </linearGradient>
        <radialGradient id="glow">
          <stop stopColor="#dcebad" stopOpacity=".35" />
          <stop offset="1" stopColor="#bde998" stopOpacity="0" />
        </radialGradient>
        <filter id="blur">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <circle cx="385" cy="158" r="154" fill="url(#glow)" />
      <circle cx="437" cy="91" r="35" fill="#dbe2b7" opacity=".7" />
      <path
        d="m30 244 111-111 56 75 86-134 102 146 98-87 138 129"
        fill="#497061"
        opacity=".25"
      />
      <path
        d="m102 274 111-87 69 67 103-82 150 105"
        fill="#3b5a4b"
        opacity=".4"
      />
      <ellipse
        cx="348"
        cy="371"
        rx="151"
        ry="20"
        fill="#081b16"
        opacity=".35"
        filter="url(#blur)"
      />
      <path
        d="m171 284 45 65 52 7 28 48 41-37 35 15 48-61 61-35-73-58-147 2Z"
        fill="url(#rock)"
      />
      <path d="m171 284 85 14 40 106-28-48-52-7Z" fill="#263e34" />
      <path d="m337 367 7-66 76 20-48 61Z" fill="#314b3f" />
      <path d="m171 284 76-54 159-5 75 61-120 36-108-10Z" fill="#739174" />
      <path d="m181 282 69-43 153-7 64 53-108 24-105-9Z" fill="#597553" />
      <path
        d="m321 263 16 22-24 15 20 15-37 18"
        stroke="#b7b28a"
        strokeWidth="17"
      />
      <path
        d="m321 263 16 22-24 15 20 15-37 18"
        stroke="#c6c39b"
        strokeWidth="11"
      />
      <path
        d="M284 260V176a41 41 0 0 1 82 0v84"
        stroke="#b6b79a"
        strokeWidth="21"
      />
      <path d="M294 262V178a31 31 0 0 1 62 0v84Z" fill="url(#gate)" />
      <path
        d="M284 261V176a41 41 0 0 1 82 0v85"
        stroke="#d0cfac"
        strokeWidth="5"
      />
      <path
        d="m283 192-12-4m12 36-13 3m96-38 11-5m-11 43 12 1m-78-82-9-9m55 9 8-9m-29 0v-13"
        stroke="#667864"
        strokeWidth="3"
      />
      <path d="m325 174 8 14-8 14-8-14Z" fill="#f1f1c7" />
      {[
        [224, 239, 1],
        [401, 255, 1.1],
        [445, 279, 0.85],
        [193, 273, 0.7],
        [263, 228, 0.55],
        [387, 220, 0.7],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M0 0v-54" stroke="#736e50" strokeWidth="5" />
          <path
            d="m0-99-28 49h13L-34-18h68L15-50h13Z"
            fill={i % 2 ? "#264c3d" : "#365b43"}
          />
          <path d="M0-99v81h34L15-50h13Z" fill="#193d31" opacity=".65" />
        </g>
      ))}
      <path d="m227 293 8-10 16 4-1 12Z" fill="#bac09b" />
      <path d="m379 288 9-9 14 5-3 11Z" fill="#a4ad89" />
      {[
        [266, 171],
        [391, 138],
        [301, 95],
        [464, 214],
        [246, 202],
        [354, 106],
        [384, 289],
        [308, 224],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i % 2 ? 2 : 3}
          fill="#d7e5a0"
          opacity=".7"
        />
      ))}
      <path d="m495 332 12-13 32 6-20 20Z" fill="#61785d" />
      <path d="m507 345 12 14 20-34-20 20Z" fill="#314b3f" />
      <path d="m130 218 14-12 23 9-12 13Z" fill="#6a7d62" />
      <path d="m130 218 16 24 9-14Z" fill="#324c40" />
    </svg>
  );
}
