export const themeIds = ["one-piece", "mcu"] as const;
export const themes = [
  { id: "one-piece", name: "One Piece" },
  { id: "mcu", name: "MCU" },
] as const;
export type ThemeId = (typeof themes)[number]["id"];
export const themeName = (id?: string) =>
  themes.find((t) => t.id === (id ?? "one-piece"))?.name ?? "Thème inconnu";
