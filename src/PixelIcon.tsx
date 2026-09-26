export type IconName =
  | "portal"
  | "swords"
  | "ticket"
  | "profile"
  | "compass"
  | "coin"
  | "trophy"
  | "gear"
  | "mail";
const shapes: Record<IconName, string> = {
  coin: "M7 2h10v2h3v3h2v10h-2v3h-3v2H7v-2H4v-3H2V7h2V4h3V2Zm0 4v2H6v8h2v2h8v-2h2V8h-2V6H7Zm3 2h4v2h-2v6h-2V8Z",
  trophy:
    "M6 2h12v3h4v8h-2v2h-5v2h-2v3h5v2H6v-2h5v-3H9v-2H4v-2H2V5h4V2Zm0 5H4v4h2V7Zm12 0v4h2V7h-2Z",
  gear: "M9 1h6v4h3V3h3v3h-2v3h4v6h-4v3h2v3h-3v-2h-3v4H9v-4H6v2H3v-3h2v-3H1V9h4V6H3V3h3v2h3V1Zm1 7v2H8v4h2v2h4v-2h2v-4h-2V8h-4Z",
  mail: "M2 4h20v16H2V4Zm2 2v2h2v2h2v2h2v2h4v-2h2v-2h2V8h2V6H4Zm0 5v7h16v-7h-2v2h-2v2h-2v1h-4v-1H8v-2H6v-2H4Z",
  portal: "M9 2h6v2h3v3h2v15h-6V11h-4v11H4V7h2V4h3V2Zm1 4v2H8v11H6V8h2V6h2Z",
  swords:
    "M2 2h3v2h2v2h2v2h2v2H9v2H7v-2H5V8H3V6H2V2Zm17 0h3v4h-1v2h-2v2h-2v2h-2v-2h-2V8h2V6h2V4h2V2ZM9 12l3 3 3-3 2 2-3 3 2 2 2-2 2 2-2 2-2 2-2-2 2-2-4-4-4 4 2 2-2 2-2-2-2-2 2-2 2 2 2-2-3-3 2-2Z",
  ticket:
    "M3 5h18v5h-2v4h2v5H3v-5h2v-4H3V5Zm2 2v1h2v8H5v1h14v-1h-2V8h2V7H5Zm7 1h2v2h-2V8Zm0 4h2v2h-2v-2Zm0 4h2v1h-2v-1Z",
  profile:
    "M9 2h6v2h2v6h-2v2H9v-2H7V4h2V2Zm0 2v6h6V4H9Zm-2 10h10v2h3v6H4v-6h3v-2Zm0 2v2H6v2h12v-2h-1v-2H7Z",
  compass:
    "M11 1h2v3h4v2h3v3h1v2h2v2h-2v2h-1v3h-3v2h-4v3h-2v-3H7v-2H4v-3H3v-2H1v-2h2V9h1V6h3V4h4V1Zm-2 5v2H6v8h3v2h6v-2h3V8h-3V6H9Zm2 2h2v3h3v2h-3v3h-2v-3H8v-2h3V8Z",
};
export function PixelIcon({
  name,
  size = 24,
}: {
  name: IconName;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d={shapes[name]} />
    </svg>
  );
}
