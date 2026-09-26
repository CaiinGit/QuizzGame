import { test, expect } from "@playwright/test";

test("dark palette follows navigation, persists and returns to light", async ({
  page,
}) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Mode sombre", exact: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(48, 48, 48)",
  );
  await expect(page.locator(".wordmark")).toHaveCSS(
    "color",
    "rgb(146, 170, 225)",
  );
  await expect(
    page.getByRole("button", { name: "Choisir un mode", exact: true }),
  ).toHaveCSS("background-color", "rgb(146, 170, 225)");
  await expect(page.getByRole("navigation")).toHaveCSS(
    "background-color",
    "rgb(48, 48, 48)",
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#303030",
  );
  // Native Preferences uses localStorage on web; wait for the saved value before reload.
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("CapacitorStorage.akasha.theme.v1"),
      ),
    )
    .toBe("dark");
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const button = (await toggle.boundingBox())!;
    const title = (await page.locator(".wordmark").boundingBox())!;
    const settings = (await page
      .getByRole("button", { name: "Réglages de connexion" })
      .boundingBox())!;
    expect(button.x + button.width).toBeLessThanOrEqual(title.x);
    expect(title.x + title.width).toBeLessThanOrEqual(settings.x);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/akasha-dark-accueil.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Choisir un mode", exact: true })
    .click();
  await expect(page.locator(".mode-card")).toHaveCSS(
    "background-color",
    "rgb(48, 48, 48)",
  );
  await expect(page.locator(".mode-art")).toHaveCSS(
    "background-color",
    "rgb(146, 170, 225)",
  );
  await page
    .getByRole("button", { name: "Classique, duel 1 contre 1" })
    .click();
  await expect(page.locator(".island-caption")).toHaveCSS(
    "background-color",
    "rgb(48, 48, 48)",
  );
  await page.getByRole("button", { name: "One Piece", exact: true }).click();
  await page
    .getByRole("button", { name: "Créer un duel", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCSS(
    "background-color",
    "rgb(48, 48, 48)",
  );
  await expect(page.getByLabel("Ton pseudo", { exact: true })).toHaveCSS(
    "color",
    "rgb(146, 170, 225)",
  );
  await page.screenshot({
    path: "test-results/akasha-dark-dialogue.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Profil", exact: true })
    .click();
  await expect(page.locator(".profile-panel")).toHaveCSS(
    "background-color",
    "rgb(48, 48, 48)",
  );
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("CapacitorStorage.akasha.theme.v1"),
      ),
    )
    .toBe("light");
  await page.reload();
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(243, 237, 223)",
  );
  await expect(page.locator(".wordmark")).toHaveCSS("color", "rgb(35, 72, 54)");
});
