import { test, expect } from "@playwright/test";

test("navigation keeps home centered, opens future pages and moves profile to the avatar", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("button")).toHaveText([
    "Classement",
    "Accueil",
    "Boutique",
  ]);
  await expect(
    page.getByRole("button", { name: "Jouer", exact: true }),
  ).toHaveCount(0);
  await expect(nav).toHaveCSS("background-color", "rgb(35, 72, 54)");
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const bar = (await nav.boundingBox())!;
    const home = (await nav
      .getByRole("button", { name: "Accueil", exact: true })
      .boundingBox())!;
    expect(
      Math.abs(home.x + home.width / 2 - (bar.x + bar.width / 2)),
    ).toBeLessThan(1);
    expect(bar.y + bar.height).toBeLessThanOrEqual(viewport.height);
    await expect(
      nav.getByRole("button", { name: "Accueil", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
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
