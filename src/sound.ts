import { Preferences } from "@capacitor/preferences";

export type Sound =
  "tap" | "navigate" | "answer" | "notification" | "correct" | "wrong";
const KEY = "akasha.sound.v1";
let enabled = true;
let context: AudioContext | null = null;
let master: GainNode | null = null;
let writes = Promise.resolve();
let lastPlayed = -Infinity;

export const soundsEnabled = () => enabled;
export async function initializeSound() {
  try {
    const { value } = await Preferences.get({ key: KEY });
    enabled = value !== "off";
  } catch {
    /* Local audio remains usable when preferences are unavailable. */
  }
}
export function saveSound(value: boolean) {
  enabled = value;
  if (context && master) {
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(value ? 0.055 : 0, context.currentTime);
  }
  writes = writes
    .catch(() => {})
    .then(() => Preferences.set({ key: KEY, value: value ? "on" : "off" }));
  return writes;
}
export function unlockSound() {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    if (!master) {
      master = context.createGain();
      master.gain.value = 0.055;
      master.connect(context.destination);
    }
    if (context.state === "suspended") void context.resume().catch(() => {});
  } catch {
    /* An unsupported or blocked audio device must never block play. */
  }
}
const notes: Record<Sound, number[]> = {
  tap: [520],
  navigate: [520, 780],
  answer: [360, 540],
  notification: [660, 880, 1100],
  correct: [660, 880],
  wrong: [260, 195],
};
export function playSound(sound: Sound) {
  if (
    !enabled ||
    !context ||
    !master ||
    context.state !== "running" ||
    document.hidden
  )
    return;
  const now = context.currentTime;
  if (now - lastPlayed < 0.05) return;
  lastPlayed = now;
  try {
    notes[sound].forEach((frequency, index) => {
      const start = now + index * 0.085;
      const oscillator = context!.createOscillator();
      const envelope = context!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(1, start + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.11);
      oscillator.connect(envelope);
      envelope.connect(master!);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + 0.12);
    });
  } catch {
    /* Audio is optional. */
  }
}

export function listenForSoundInteractions() {
  // Unlock from a real gesture, never autoplay on arrival or on socket events.
  const unlock = () => unlockSound();
  const click = (event: MouseEvent) => {
    const target =
      event.target instanceof Element ? event.target.closest("button") : null;
    if (
      !(target instanceof HTMLButtonElement) ||
      target.disabled ||
      target.dataset.sound === "off"
    )
      return;
    const sound: Sound = target.classList.contains("answer")
      ? "answer"
      : target.closest("nav") ||
          target.classList.contains("screen-back") ||
          target.classList.contains("selection-card")
        ? "navigate"
        : "tap";
    playSound(sound);
  };
  document.addEventListener("pointerdown", unlock, true);
  document.addEventListener("keydown", unlock, true);
  document.addEventListener("click", click, true);
  return () => {
    document.removeEventListener("pointerdown", unlock, true);
    document.removeEventListener("keydown", unlock, true);
    document.removeEventListener("click", click, true);
  };
}
