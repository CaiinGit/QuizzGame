import { test, expect } from "@playwright/test";

test("compact mode and theme tiles fit phones in both palettes and keep the duel path", async ({
  page,
}) => {
  await page.goto("/");
  for (const dark of [false, true]) {
    if (dark) {
      await page.getByRole("button", { name: "Réglages", exact: true }).click();
      await page
        .getByRole("button", { name: "Mode sombre", exact: true })
        .click();
      await page.keyboard.press("Escape");
    }
    for (const screen of ["mode", "classique"]) {
      await page.goto(`/#${screen}`);
      const tile = page.locator(".selection-card:not(:disabled)").first();
      await expect(page.locator(".selection-card:not(:disabled)")).toHaveCount(
        screen === "mode" ? 2 : 1,
      );
      if (screen === "mode")
        await expect(
          page.getByRole("button", { name: "Solo", exact: true }),
        ).toBeEnabled();
      else
        await expect(
          page.getByRole("button", { name: "À venir", exact: true }),
        ).toBeDisabled();
      await expect(tile).toHaveCSS("--tile-face", dark ? "#ffa800" : "#234836");
      await expect(page.locator('img[src*="one-piece-island"]')).toHaveCount(0);
      if (screen === "mode") {
        await expect
          .poll(() =>
            tile
              .locator("img")
              .evaluate(
                (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
              ),
          )
          .toBe(true);
      }
      for (const viewport of [
        { width: 320, height: 568 },
        { width: 390, height: 844 },
        { width: 1280, height: 900 },
      ]) {
        await page.setViewportSize(viewport);
        const card = (await tile.boundingBox())!;
        const logo = (await tile.locator(".selection-logo").boundingBox())!;
        const label = (await tile.locator(".selection-name").boundingBox())!;
        const locked = (await page
          .locator(".selection-card")
          .nth(1)
          .boundingBox())!;
        const nav = (await page.getByRole("navigation").boundingBox())!;
        expect(card.height).toBeLessThanOrEqual(180);
        expect(card.x + card.width).toBeLessThan(locked.x);
        expect(logo.y + logo.height).toBeLessThanOrEqual(label.y);
        expect(card.y + card.height).toBeLessThan(nav.y);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect(
          await tile
            .locator(".selection-name")
            .evaluate((el) => el.scrollWidth <= el.clientWidth),
        ).toBe(true);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: `test-results/akasha-${screen}-tiles-${dark ? "dark" : "light"}.png`,
        fullPage: true,
      });
    }
  }
  await page.getByRole("button", { name: "One Piece", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Créer un duel", exact: true }),
  ).toBeVisible();
  await expect(page.locator('img[src*="one-piece-island"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "One Piece", exact: true }),
  ).toBeVisible();
});
