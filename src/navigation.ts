import { useEffect, useState } from "react";
import { themeIds, type ThemeId } from "../shared/themes";

const routes = [
  "accueil",
  "mode",
  "favorite-one-piece",
  "favorite-mcu",
  "classique",
  "solo",
  "solo-one-piece",
  "solo-mcu",
  "one-piece",
  "mcu",
  "rejoindre",
  "profil",
  "amis",
  "historique",
  "classement",
  "boutique",
] as const;
export type Screen = (typeof routes)[number];
const parents: Record<Screen, Screen> = {
  accueil: "accueil",
  mode: "accueil",
  "favorite-one-piece": "accueil",
  "favorite-mcu": "accueil",
  classique: "mode",
  solo: "mode",
  "solo-one-piece": "solo",
  "solo-mcu": "solo",
  "one-piece": "classique",
  mcu: "classique",
  rejoindre: "accueil",
  profil: "accueil",
  amis: "accueil",
  historique: "profil",
  classement: "accueil",
  boutique: "accueil",
};
export const screenTheme = (screen: Screen): ThemeId =>
  themeIds.find((id) =>
    [id, `solo-${id}`, `favorite-${id}`].includes(screen),
  ) ?? "one-piece";
export const isThemeScreen = (screen: Screen) =>
  themeIds.some((id) => screen === id || screen === `solo-${id}`);
export const themeRoute = (
  id: ThemeId,
  kind: "duel" | "solo" | "favorite" = "duel",
): Screen => (kind === "duel" ? id : `${kind}-${id}`) as Screen;
const current = (): Screen => {
  const hash = window.location.hash.slice(1);
  return routes.includes(hash as Screen) ? (hash as Screen) : "accueil";
};
export function useNavigation() {
  const [screen, setScreen] = useState<Screen>(current);
  useEffect(() => {
    const changed = () => setScreen(current());
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  function navigate(next: Screen) {
    if (next !== current()) window.location.hash = next;
    setScreen(next);
  }
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);
  return { screen, navigate, back: () => navigate(parents[screen]) };
}
