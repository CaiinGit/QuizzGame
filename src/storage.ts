import { Preferences } from "@capacitor/preferences";
import { initialState, parseState, type State } from "./game";
export const STORAGE_KEY = "quizzgame.save.v1";
let pending: Promise<void> = Promise.resolve();
export async function loadState(): Promise<{ state: State; error?: string }> {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (!value) return { state: initialState() };
    try {
      return { state: parseState(value) };
    } catch {
      await Preferences.set({
        key: `${STORAGE_KEY}.backup.${Date.now()}`,
        value,
      });
      return {
        state: initialState(),
        error:
          "La sauvegarde était illisible. Une copie de secours a été conservée ; un nouveau profil a été créé.",
      };
    }
  } catch {
    return {
      state: initialState(),
      error:
        "Le stockage est indisponible. Ta progression risque de ne pas être conservée.",
    };
  }
}
export function saveState(state: State): Promise<void> {
  // Serialize writes so a slower previous answer cannot overwrite a newer result.
  const value = JSON.stringify(state);
  const write = pending
    .catch(() => undefined)
    .then(() => Preferences.set({ key: STORAGE_KEY, value }));
  pending = write;
  return write;
}
