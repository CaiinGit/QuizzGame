import { test, expect } from "@playwright/test";

test("home puts daily challenge and three empty favorites above the portal", async ({
  page,
}) => {
  await page.goto("/");
  const daily = page.getByRole("button", { name: "Défi du jour", exact: true });
  const favorites = page.getByRole("group", { name: "Thèmes favoris" });
  const play = page.getByRole("button", { name: "Jouer", exact: true });
  await expect(play).toBeVisible();
  await expect(page.locator(".home-play")).toHaveCount(0);
  await expect(page.locator(".akasha-portal")).toHaveCSS(
    "--portal-energy",
    "#5fac7c",
  );
  await expect(daily).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choisir un mode" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Rejoindre un ami" }),
  ).toHaveCount(0);
  await expect(favorites.getByRole("button")).toHaveCount(3);
  await expect(favorites.getByRole("button")).toHaveText(["", "", ""]);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const dailyBox = (await daily.boundingBox())!;
    const favoritesBox = (await favorites.boundingBox())!;
    const portalBox = (await page.locator(".portal-stage").boundingBox())!;
    const navBox = (await page.getByRole("navigation").boundingBox())!;
    const playBox = (await play.boundingBox())!;
    expect(playBox.y).toBeGreaterThanOrEqual(
      favoritesBox.y + favoritesBox.height,
    );
    expect(playBox.y + playBox.height).toBeLessThanOrEqual(navBox.y);
    await expect(play).toBeInViewport({ ratio: 1 });
    expect(dailyBox.y + dailyBox.height).toBeLessThanOrEqual(favoritesBox.y);
    expect(favoritesBox.y + favoritesBox.height).toBeLessThanOrEqual(
      portalBox.y,
    );
    expect(portalBox.y + portalBox.height).toBeLessThanOrEqual(navBox.y);
    const artBox = (await page.locator(".portal-art").boundingBox())!;
    expect(artBox.y + artBox.height).toBeLessThanOrEqual(navBox.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await daily.click();
  await expect(
    page.getByRole("dialog").getByText("À venir", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  for (let i = 0; i < 3; i++) {
    const slot = favorites.getByRole("button").nth(i);
    await slot.click();
    await expect(
      page.getByRole("heading", { name: "Choisis ton thème" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Ajouter One Piece aux favoris",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Accueil", exact: true })
      .click();
  }
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: "test-results/akasha-home-shortcuts-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await page.getByRole("button", { name: "Mode sombre", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(favorites.getByRole("button").first()).toHaveCSS(
    "--tile-face",
    "#ffa800",
  );
  await expect(page.locator(".akasha-portal")).toHaveCSS(
    "--portal-energy",
    "#ffa800",
  );
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: "test-results/akasha-home-shortcuts-dark.png",
    fullPage: true,
  });
  await play.click();
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await expect(play).toBeVisible();
});

test("only the portal opening starts entry; cancelling and returning allow another entry", async ({
  page,
}) => {
  await page.goto("/");
  const art = page.locator(".portal-stage .portal-art");
  const bounds = (await art.boundingBox())!;
  const scale = Math.min(bounds.width / 600, bounds.height / 800);
  const left = bounds.x + (bounds.width - 600 * scale) / 2;
  const top = bounds.y + (bounds.height - 800 * scale) / 2;
  await page.mouse.click(left + 80 * scale, top + 480 * scale);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const play = page.getByRole("button", { name: "Jouer", exact: true });
  await play.click();
  await expect(
    page.getByRole("dialog", { name: "Entrée dans le portail" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toHaveCount(0);
  const zoom = page.locator(".portal-entry-zoom");
  const before = await zoom.evaluate((el) => getComputedStyle(el).transform);
  await expect
    .poll(() => zoom.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(before);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await play.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await play.focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toBeVisible();
});

test("reduced motion skips the zoom, and leaving home cancels pending entry", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => {
    location.hash = "amis";
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.waitForTimeout(1000);
  expect(new URL(page.url()).hash).toBe("#amis");
});
