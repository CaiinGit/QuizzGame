import { Preferences } from "@capacitor/preferences";

export type Theme = "light" | "dark";
const THEME_KEY = "akasha.theme.v1";
let writes = Promise.resolve();

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#303030" : "#f3eddf");
}

export async function initializeTheme() {
  let theme: Theme = "light";
  try {
    const { value } = await Preferences.get({ key: THEME_KEY });
    if (value === "dark") theme = "dark";
  } catch {
    // Storage can be unavailable; the appearance control still works.
  }
  applyTheme(theme);
}

export function saveTheme(theme: Theme) {
  applyTheme(theme);
  // Keep rapid toggles in order on native storage too.
  writes = writes
    .catch(() => {})
    .then(() => Preferences.set({ key: THEME_KEY, value: theme }));
  return writes;
}
