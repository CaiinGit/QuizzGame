export const themes = [{ id: "one-piece", name: "One Piece" }] as const;
export type ThemeId = (typeof themes)[number]["id"];
