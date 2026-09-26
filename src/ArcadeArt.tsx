import type { ReactNode } from "react";

type ArcadeIconName =
  "coin" | "trophy" | "gear" | "mail" | "daily" | "home" | "podium" | "chest";
const ink = "#101426";

/** Layered pixel shapes reproduce the bevels of the supplied header reference. */
export function ArcadeIcon({ name }: { name: ArcadeIconName }) {
  return (
    <svg
      className={`arcade-icon arcade-icon-${name}`}
      viewBox="0 0 32 32"
      width="32"
      height="32"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {name === "home" && (
        <>
          <path
            fill={ink}
            d="M14 1h4v3h3v3h3v3h3v3h3v17H2V13h3v-3h3V7h3V4h3Z"
          />
          <path fill="#9d293a" d="M14 5h4v3h3v3h3v3h3v3H5v-3h3v-3h3V8h3Z" />
          <path fill="#f45155" d="M14 5h4v3h3v3h3v3H8v-3h3V8h3Z" />
          <path fill="#ff9390" d="M14 5h4v2h-3v3h-3v3H9v-2h2V8h3Z" />
          <path fill="#bdd3e5" d="M5 17h22v10H5Z" />
          <path fill="#f6faff" d="M5 17h20v8h-5v-8h-8v10H5Z" />
          <path fill={ink} d="M13 20h7v7h-7Z" />
          <path fill="#fff" d="M5 17h22v2H5Z" />
        </>
      )}
      {name === "podium" && (
        <>
          <path
            fill={ink}
            d="M16 0 20 5 26 6 22 11 23 17 16 14 9 17 10 11 6 6 12 5Z"
          />
          <path
            fill="#e7a52f"
            d="M16 3 18 7 22 8 19 11 20 14 16 12 12 14 13 10 10 8 14 7Z"
          />
          <path
            fill="#ffe57a"
            d="M16 3 18 7 16 8 15 11 12 14 13 10 10 8 14 7Z"
          />
          <path fill="#fff3b5" d="M15 5h2v2h-2Z" />
          <path fill={ink} d="M11 16h10v6h9v2h2v8H0V22h11Z" />
          <path fill="#7e98b6" d="M3 24h8v5H3Zm10-6h6v11h-6Zm8 6h8v5h-8Z" />
          <path fill="#c8dcec" d="M3 24h8v3H3Zm10-6h6v9h-6Zm8 6h8v3h-8Z" />
          <path
            fill="#eff8ff"
            d="M13 18h6v2h-4v5h-2ZM3 24h7v1H3Zm18 0h7v1h-7Z"
          />
          <path fill="#a3bbd4" d="M17 21h2v8h-2ZM3 28h8v1H3Zm18 0h8v1h-8Z" />
        </>
      )}
      {name === "chest" && (
        <>
          <path fill={ink} d="M6 4h20v3h3v4h2v18H1V11h2V7h3Z" />
          <path fill="#643c37" d="M6 7h20v4h2v15H4V11h2Z" />
          <path fill="#c07a42" d="M6 7h19v4h3v6H4v-6h2Z" />
          <path fill="#e5a561" d="M7 7h17v2H7Zm-2 5h21v2H5Z" />
          <path fill="#8f512e" d="M4 19h24v7H4Z" />
          <path fill="#b76a35" d="M5 19h20v5H5Z" />
          <path fill="#382a31" d="M4 16h24v3H4Z" />
          <path fill="#f0c574" d="M6 7h3v19H6Zm17 0h3v19h-3Z" />
          <path fill="#b17b34" d="M8 9h1v17H8Zm17 0h1v17h-1Z" />
          <path fill={ink} d="M12 14h8v9h-8Z" />
          <path fill="#ffdd79" d="M14 15h4v6h-4Z" />
          <path fill="#81512f" d="M15 17h2v3h-2Z" />
          <path fill="#ffe8b2" d="M6 7h3v2H6Zm17 0h3v2h-3Z" />
        </>
      )}
      {name === "daily" && (
        <>
          <path fill={ink} d="M7 0h6v4h6V0h6v4h3v2h2v24h-3v2H5v-2H2V6h2V4h3Z" />
          <path fill="#8e9bb0" d="M5 7h22v22H5Z" />
          <path fill="#e4ebf3" d="M5 12h21v17H5Z" />
          <path fill="#fff" d="M5 12h19v16H6v-2H5Z" />
          <path fill="#b72c3b" d="M5 7h22v6H5Z" />
          <path fill="#ff484c" d="M5 6h21v6H5Z" />
          <path fill="#ff8280" d="M5 6h2v5H5Zm8 0h6v1h-6Z" />
          <path fill={ink} d="M7 2h6v7H7Zm12 0h6v7h-6Z" />
          <path fill="#b5c9db" d="M9 2h2v5H9Zm12 0h2v5h-2Z" />
          <path fill="#fff" d="M9 2h1v4H9Zm12 0h1v4h-1Z" />
          <path
            fill="#df2927"
            d="M15 14h3v3h2v3h2v2h1v4h-2v2H11v-2H9v-5h2v-3h2v2h2Z"
          />
          <path fill="#ff8716" d="M15 18h3v4h2v4h-2v2h-5v-2h-2v-4h2v1h2Z" />
          <path fill="#ffe54d" d="M15 22h2v2h2v3h-1v1h-4v-2h-1v-2h2Z" />
          <path fill="#fff4b2" d="M15 25h2v3h-2Z" />
        </>
      )}
      {name === "coin" && (
        <>
          <path
            fill={ink}
            d="M10 1h12v3h4v4h3v16h-3v4h-4v3H10v-3H6v-4H3V8h3V4h4Z"
          />
          <path fill="#a85a14" d="M10 4h12v3h4v17h-4v4H10v-3H7V8h3Z" />
          <path fill="#f4ae18" d="M10 4h11v3h3v15h-3v4H10v-3H7V8h3Z" />
          <path fill="#ffe571" d="M10 4h11v3H11v3H8v11H6V9h2V6h2Z" />
          <path fill="#ffe24e" d="M12 8h8v2h2v11h-3v3h-8v-3H9V11h3Z" />
          <path fill="#e4920e" d="M20 8h2v13h-3v3h-8v-2h7v-3h2Z" />
          <path fill="#fff29a" d="M12 8h7v2h-6v3h-2v7H9v-9h3Z" />
          <path fill="#ffca28" d="M13 12h5v8h-5Z" />
          <path fill="#fff6be" d="M10 4h6v2h-6v3H8V6h2Z" />
        </>
      )}
      {name === "trophy" && (
        <>
          <path
            fill={ink}
            d="M8 2h17v3h6v12h-3v3h-6v3h-3v4h6v4H7v-4h6v-4h-3v-3H4v-3H1V5h7Z"
          />
          <path
            fill="#b36b16"
            d="M4 8h6v3H6v4h5v3H6v-3H4Zm19 0h5v7h-3v3h-5v-3h5v-4h-2Z"
          />
          <path fill="#ffe16b" d="M4 7h6v2H6v6H4Zm19 0h5v2h-5Z" />
          <path
            fill="#f5b91c"
            d="M10 5h13v11h-2v4h-3v7h5v2H9v-2h6v-7h-3v-4h-2Z"
          />
          <path fill="#ffdd45" d="M10 5h10v12h-2v3h-4v-3h-2v-4h-2Z" />
          <path fill="#fff29c" d="M10 5h11v2H12v8h-2Z" />
          <path fill="#cb8210" d="M21 7h2v10h-2v3h-3v7h5v2H9v-2h7v-8h3v-3h2Z" />
          <path fill="#ffe77a" d="M15 21h2v6h-2Zm-6 6h6v2H9Z" />
        </>
      )}
      {name === "gear" && (
        <>
          <path
            fill={ink}
            d="M12 0h8v4h4V3h3v5h3v4h2v8h-3v4h-2v5h-5v-1h-2v4h-8v-4H9v1H5v-5H2v-4H0v-8h3V8h2V3h4v1h3Z"
          />
          <path
            fill="#7d91b1"
            d="M14 3h4v4h5V6h2v5h3v3h2v4h-3v4h-3v4h-3v-2h-3v5h-4v-5h-4v2H7v-4H4v-4H2v-4h3v-3h3V6h2v2h4Z"
          />
          <path
            fill="#cedcec"
            d="M14 3h4v4h4V6h3v5h2v3h3v3h-4v4h-3v3h-3v-1h-3v5h-3v-5h-4v2H7v-4H5v-4H2v-3h4v-3h2V6h2v2h4Z"
          />
          <path
            fill="#f1f7ff"
            d="M14 3h4v2h-2v4h-4V7h2ZM8 6h2v3H8Zm-2 5h3v3H5v3H2v-3h4Z"
          />
          <path
            fill="#adbfda"
            d="M25 11h2v3h3v3h-4v4h-3v3h-3v-1h-3v5h-3v-3h1v-4h6v-3h3v-4h1Z"
          />
          <path fill="#eff6ff" d="M12 10h8v2h2v8h-2v2h-8v-2h-2v-8h2Z" />
          <path fill={ink} d="M13 11h6v2h2v6h-2v2h-6v-2h-2v-6h2Z" />
          <path fill="#33425b" d="M14 14h4v4h-4Z" />
        </>
      )}
      {name === "mail" && (
        <>
          <path fill={ink} d="M3 5h26v2h3v22H0V7h3Z" />
          <path fill="#76859e" d="M3 8h26v18H3Z" />
          <path fill="#c5d9ef" d="M3 8h25v16H3Z" />
          <path fill="#e9f5fc" d="M3 9h3v3h3v3h4v3h6v-3h4v-3h3V9h3v15H3Z" />
          <path fill="#fff" d="M4 8h24v2h-3v3h-4v3h-3v2h-4v-2h-3v-3H7v-3H4Z" />
          <path
            fill="#28354f"
            d="M3 8h3v3h3v3h4v3h6v-3h4v-3h3V8h3v4h-3v3h-4v3h-3v3h-6v-3h-3v-3H6v-3H3Z"
          />
          <path
            fill="#a3b5d0"
            d="M3 24h3v-3h3v-3h3v2h-2v3H7v2h18v-2h-3v-3h-2v-2h3v3h3v3h3v3H3Z"
          />
          <path fill="#fff" d="M5 14h2v4H5Z" />
        </>
      )}
    </svg>
  );
}

export function PortraitFrame({ children }: { children: ReactNode }) {
  const opening = "M12 10H52V12H54V52H52V54H12V52H10V12H12Z";
  return (
    <span className="portrait-frame">
      <span className="portrait-content">{children}</span>
      <svg
        className="portrait-bevel"
        viewBox="0 0 64 64"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <path
          fill={ink}
          fillRule="evenodd"
          d={`M8 0H56V2H60V6H62V10H64V54H62V58H58V62H54V64H10V62H6V60H2V56H0V10H2V6H6V2H8Z ${opening}`}
        />
        <path
          fill="#728aab"
          fillRule="evenodd"
          d={`M10 3H54V5H58V9H61V54H58V58H54V61H10V58H6V54H3V10H5V6H10Z ${opening}`}
        />
        <path
          fill="#e9f7ff"
          fillRule="evenodd"
          d={`M10 3H54V5H58V9H60V53H57V57H53V60H11V57H7V53H4V11H6V7H10Z ${opening}`}
        />
        <path
          fill="#fff"
          d="M10 3H54V5H57V8H54V6H11V8H8V12H6V52H4V11H6V7H10Z"
        />
        <path fill="#b5d8ec" d="M11 8H53V10H12V12H10V52H8V12H10V10h1Z" />
        <path fill="#7dbbd9" d="M12 10H52V12H14V14H12V52H10V12H12Z" />
        <path fill="#fff" d="M54 12h2v40h-2v3h-3v1H12v-2h40v-2h2Z" />
        <path fill="#bbd2e5" d="M58 12h2v41h-3v4h-4v3H12v-2h40v-3h3v-3h3Z" />
      </svg>
    </span>
  );
}
