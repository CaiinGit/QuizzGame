import { test, expect } from "@playwright/test";

test("four navigation tabs open themes and future pages, profile stays in the avatar", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("button")).toHaveText([
    "Classement",
    "Accueil",
    "Thèmes",
    "Boutique",
  ]);
  await expect(
    page.getByRole("button", { name: "Jouer", exact: true }),
  ).toBeVisible();
  await expect(nav).toHaveCSS("background-color", "rgb(35, 72, 54)");
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const bar = (await nav.boundingBox())!;
    let right = bar.x;
    for (const button of await nav.getByRole("button").all()) {
      const box = (await button.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(right - 1);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(bar.x + bar.width);
      expect(
        await button.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      right = box.x + box.width;
    }
    expect(bar.y + bar.height).toBeLessThanOrEqual(viewport.height);
    await expect(
      nav.getByRole("button", { name: "Accueil", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
  await nav.getByRole("button", { name: "Thèmes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Choisis ton thème" }),
  ).toBeVisible();
  await expect(
    nav.getByRole("button", { name: "Thèmes", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "One Piece", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Créer un duel", exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Accueil", exact: true }).click();
  for (const label of ["Classement", "Boutique"]) {
    await nav.getByRole("button", { name: label, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: label, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".future-feature")).toContainText("À venir");
    await expect(
      nav.getByRole("button", { name: label, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await page.reload();
    await expect(
      page.getByRole("heading", { name: label, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retour", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Accueil", exact: true }),
    ).toBeAttached();
  }
  await page
    .getByRole("button", { name: "Ouvrir mon profil", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Profil", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Modifier ma photo", exact: true }),
  ).toBeVisible();
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
  await nav.getByRole("button", { name: "Accueil", exact: true }).click();
});
