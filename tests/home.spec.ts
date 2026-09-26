import { test, expect } from "@playwright/test";

test("home puts daily challenge and three empty favorites above the portal", async ({
  page,
}) => {
  await page.goto("/");
  const daily = page.getByRole("button", { name: "Défi du jour", exact: true });
  const favorites = page.getByRole("group", { name: "Thèmes favoris" });
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
      page.getByRole("heading", { name: "Tes thèmes favoris" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(slot).toBeFocused();
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
    "#92aae1",
  );
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: "test-results/akasha-home-shortcuts-dark.png",
    fullPage: true,
  });
});
