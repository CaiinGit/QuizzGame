import type { ReactNode } from "react";

export function SelectionCard({
  label,
  accessibleLabel = label,
  children,
  onClick,
}: {
  label: string;
  accessibleLabel?: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="home-tile selection-card"
      aria-label={accessibleLabel}
      onClick={onClick}
    >
      <span className="selection-logo" aria-hidden="true">
        {children}
      </span>
      <span className="selection-name">{label}</span>
    </button>
  );
}

export function FutureSelectionCard() {
  return (
    <button
      type="button"
      className="home-tile selection-card selection-card-future"
      disabled
    >
      <span className="selection-logo" aria-hidden="true">
        <svg
          viewBox="0 0 32 32"
          width="64"
          height="64"
          fill="currentColor"
          shapeRendering="crispEdges"
        >
          <path
            fillRule="evenodd"
            d="M11 3h10v3h3v10h3v14H5V16h3V6h3Zm1 4v9h8V7Zm2 14v3h1v3h2v-3h1v-3Z"
          />
        </svg>
      </span>
      <span className="selection-name">À venir</span>
    </button>
  );
}

/** Temporary mark until a theme logo is supplied. */
export function OnePieceLogo() {
  return (
    <span className="theme-logo-placeholder" aria-hidden="true">
      OP
    </span>
  );
}
