import type { Page } from "@playwright/test";

declare global {
  interface Window {
    akashaTestSounds: number[];
    akashaTestAudio: AudioContext[];
  }
}
export async function observeAudio(page: Page) {
  await page.addInitScript(() => {
    window.akashaTestSounds = [];
    window.akashaTestAudio = [];
    const NativeAudio = window.AudioContext;
    window.AudioContext = class extends NativeAudio {
      constructor() {
        super();
        window.akashaTestAudio.push(this);
      }
      createOscillator() {
        const oscillator = super.createOscillator();
        let frequency = oscillator.frequency.value;
        const setFrequency = oscillator.frequency.setValueAtTime.bind(
          oscillator.frequency,
        );
        oscillator.frequency.setValueAtTime = (value, time) => {
          frequency = value;
          return setFrequency(value, time);
        };
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (when?: number) => {
          window.akashaTestSounds.push(frequency);
          start(when);
        };
        return oscillator;
      }
    };
  });
}
