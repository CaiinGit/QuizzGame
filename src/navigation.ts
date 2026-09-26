import { useEffect, useState } from "react";

const routes = [
  "accueil",
  "mode",
  "classique",
  "one-piece",
  "rejoindre",
  "profil",
  "classement",
  "boutique",
] as const;
export type Screen = (typeof routes)[number];
const parents: Record<Screen, Screen> = {
  accueil: "accueil",
  mode: "accueil",
  classique: "mode",
  "one-piece": "classique",
  rejoindre: "accueil",
  profil: "accueil",
  classement: "accueil",
  boutique: "accueil",
};
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
