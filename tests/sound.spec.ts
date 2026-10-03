import { test, expect } from "@playwright/test";
import { observeAudio } from "./helpers/audio";

test("sounds start after interaction, navigation sounds and mute persists after reload", async ({
  page,
}) => {
  await observeAudio(page);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Jouer", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.akashaTestAudio.length)).toBe(0);
  const settings = page.getByRole("button", { name: "Réglages", exact: true });
  const toggle = page.getByRole("button", {
    name: "Effets sonores",
    exact: true,
  });
  await settings.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => page.evaluate(() => window.akashaTestAudio[0]?.state))
    .toBe("running");
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Thèmes", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.akashaTestSounds.length))
    .toBeGreaterThan(0);
  await settings.click();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  const mutedCount = await page.evaluate(() => window.akashaTestSounds.length);
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Accueil", exact: true })
    .click();
  expect(await page.evaluate(() => window.akashaTestSounds.length)).toBe(
    mutedCount,
  );
  await page.reload();
  await settings.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => window.akashaTestAudio.length)).toBe(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => page.evaluate(() => window.akashaTestAudio[0]?.state))
    .toBe("running");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.akashaTestSounds.length))
    .toBeGreaterThan(0);
});

test("unavailable audio never blocks navigation", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "AudioContext", {
      value: class {
        constructor() {
          throw new Error("No audio device");
        }
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
