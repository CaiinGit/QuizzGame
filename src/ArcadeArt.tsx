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
            d="M12 1h7v4h5v5h-4v5h-8v-4H8V5h4ZM10 15h12v7h9v9H1V21h9Z"
          />
          <path fill="#ecb332" d="M14 3h3v4h5l-4 3v4l-3-2-3 2v-4L9 7h5Z" />
          <path fill="#fff08a" d="M14 3h3v4h-3v2h-3V7h3Z" />
          <path fill="#8299b8" d="M4 24h8v4H4Zm8-7h8v11h-8Zm10 8h6v3h-6Z" />
          <path fill="#d9e8f6" d="M4 23h7v3H4Zm8-6h7v9h-7Zm9 7h7v2h-7Z" />
          <path fill="#fff" d="M12 17h7v2h-5v4h-2Z" />
          <path fill="#aabed7" d="M19 18h1v10h-1ZM4 27h7v1H4Zm18 0h6v1h-6Z" />
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
          <path fill={ink} d="M7 1h4v4h10V1h4v4h4v3h2v23H1V8h2V5h4Z" />
          <path fill="#afbed4" d="M4 8h24v20H4Z" />
          <path fill="#f5f7ff" d="M4 11h23v16H4Z" />
          <path fill="#e43e48" d="M4 7h24v5H4Z" />
          <path fill="#fff" d="M8 3h2v6H8Zm14 0h2v6h-2Z" />
          <path
            fill="#df2927"
            d="M16 13h3v4h3v4h2v5h-3v3H11v-2H8v-6h3v-4h3v3h2Z"
          />
          <path fill="#ff8b18" d="M16 17h2v4h3v5h-3v2h-6v-3h-2v-3h3v-2h3Z" />
          <path fill="#ffe559" d="M16 21h2v3h2v3h-6v-4h2Z" />
          <path fill="#fff3a0" d="M16 24h2v3h-2Z" />
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
            d="M12 0h8v5h3V3h5v5h-2v4h6v8h-6v3h2v5h-5v-2h-3v6h-8v-6H9v2H4v-5h2v-3H0v-8h6V9H4V4h5v2h3Z"
          />
          <path
            fill="#66748d"
            d="M14 3h4v5h5V6h2v2h-2v6h6v4h-6v5h2v2h-2v-2h-5v6h-4v-6H9v2H7v-2h2v-5H3v-4h6V9H7V7h2v2h5Z"
          />
          <path
            fill="#c4d8ec"
            d="M14 2h4v5h5V5h2v3h-2v5h6v4h-6v5h2v2h-3v-2h-5v6h-4v-6H8v2H6v-3h2v-5H2v-3h6V8H6V6h3v2h5Z"
          />
          <path
            fill="#eefaff"
            d="M14 2h4v2h-2v5h-3V7h1ZM2 13h6v-3h2v5H4v1H2Zm4-7h3v2H6Z"
          />
          <path
            fill="#9bb1cd"
            d="M23 13h6v4h-6v5h2v2h-3v-2h-5v6h-4v-2h2v-6h6v-5h2Z"
          />
          <path fill={ink} d="M13 10h6v3h3v6h-3v3h-6v-3h-3v-6h3Z" />
          <path fill="#536480" d="M14 13h4v1h1v4h-2v1h-3Z" />
          <path fill="#26334e" d="M14 13h4v2h-2v3h-2Z" />
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
