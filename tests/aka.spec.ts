import { test, expect, type Page } from "@playwright/test";
import type { AuthResult } from "../shared/account";

async function signIn(page: Page, account: AuthResult) {
  await page.addInitScript((credentials) => {
    localStorage.setItem(
      "CapacitorStorage.akasha.connection.v1",
      JSON.stringify({ server: location.origin, credentials }),
    );
  }, account.credentials);
  await page.goto("/");
}

test("Aka guides a new account, highlights visible targets, and remembers completion across devices", async ({
  page,
  request,
  browser,
}) => {
  const response = await request.post("/api/account/register", {
    data: { username: `aka_${Date.now().toString(36)}`, password: "Akasha!8" },
  });
  expect(response.ok()).toBeTruthy();
  const account: AuthResult = await response.json();
  await signIn(page, account);
  const tour = page.getByRole("dialog", { name: "Visite guidée avec Aka" });
  await expect(tour).toBeVisible();
  await expect(tour.getByRole("heading")).toHaveText("Salut, moi c’est Aka !");
  await expect(tour.locator("img")).toHaveCSS("visibility", "visible");
  await expect
    .poll(() => tour.locator("img").evaluate((el) => el.getAnimations().length))
    .toBe(1);
  await page.waitForTimeout(850);
  await page.screenshot({ path: "test-results/aka-welcome-light.png" });
  await page.setViewportSize({ width: 320, height: 568 });
  for (let step = 0; step < 6; step++) {
    await expect(tour.locator(".aka-caption span")).toHaveText(
      `${step + 1} / 6`,
    );
    await expect(tour.locator(".aka-next")).toBeInViewport({ ratio: 1 });
    const bubble = (await tour.locator(".aka-bubble").boundingBox())!;
    const target = (await tour
      .locator(".aka-spotlight > rect[fill='none']")
      .first()
      .boundingBox())!;
    // The dialogue must not cover the control that Aka is explaining.
    expect(
      bubble.y + bubble.height <= target.y ||
        bubble.y >= target.y + target.height ||
        bubble.x + bubble.width <= target.x ||
        bubble.x >= target.x + target.width,
    ).toBeTruthy();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    if (step === 2) {
      await tour.getByRole("button", { name: "Étape précédente" }).click();
      await expect(tour.locator(".aka-caption span")).toHaveText("2 / 6");
      await tour.getByRole("button", { name: "Suivant", exact: true }).click();
    }
    await page.screenshot({
      path: `test-results/aka-small-step-${step + 1}.png`,
    });
    await tour.locator(".aka-next").click();
  }
  await expect(tour).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get("/api/account/me", {
              headers: { Authorization: `Bearer ${account.credentials.token}` },
            })
          ).json()
        ).onboardingCompleted,
    )
    .toBe(true);
  const other = await browser.newContext();
  try {
    const second = await other.newPage();
    await signIn(second, account);
    await expect(second.locator(".header-level")).toBeVisible();
    await expect(second.locator(".aka-tour")).toHaveCount(0);
  } finally {
    await other.close();
  }
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Réglages", exact: true }),
  ).toBeVisible();
  await expect(tour).toHaveCount(0);
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await page.getByRole("button", { name: "Mode sombre", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Revoir la visite avec Aka" }).click();
  await expect(tour).toBeVisible();
  await expect(tour.locator("img")).toHaveCSS("animation-name", "none");
  await page.screenshot({ path: "test-results/aka-welcome-dark.png" });
  await page.keyboard.press("Escape");
  await expect(tour).toHaveCount(0);
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toBeVisible();
});

test("skipping is saved even if completion cannot reach the server, then retried", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/account/register", {
    data: { username: `skip_${Date.now().toString(36)}`, password: "Akasha!8" },
  });
  const account: AuthResult = await response.json();
  await page.route("**/api/account/onboarding/complete", (route) =>
    route.abort(),
  );
  await signIn(page, account);
  await page.getByRole("button", { name: "Passer la visite" }).click();
  await expect(page.locator(".aka-tour")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Réglages", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".aka-tour")).toHaveCount(0);
  await page.unroute("**/api/account/onboarding/complete");
  await page.reload();
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get("/api/account/me", {
              headers: { Authorization: `Bearer ${account.credentials.token}` },
            })
          ).json()
        ).onboardingCompleted,
    )
    .toBe(true);
});
