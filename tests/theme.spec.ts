import { test, expect } from "@playwright/test";

test("theme is in settings, follows navigation and survives reload", async ({
  page,
}) => {
  await page.goto("/");
  const settings = page.getByRole("button", { name: "Réglages", exact: true });
  const toggle = page.getByRole("button", { name: "Mode sombre", exact: true });
  await expect(toggle).toHaveCount(0);
  await expect(page.locator(".player-header")).toHaveCSS(
    "background-color",
    "rgb(35, 72, 54)",
  );
  await settings.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(toggle.locator(".lucide-sun")).toBeVisible();
  await toggle.click();
  await expect(toggle.locator(".lucide-moon")).toBeVisible();
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(48, 48, 48)",
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#303030",
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("CapacitorStorage.akasha.theme.v1"),
      ),
    )
    .toBe("dark");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator(".player-header")).toHaveCSS(
    "background-color",
    "rgb(146, 170, 225)",
  );
  await expect(page.locator(".player-header")).toHaveCSS(
    "color",
    "rgb(48, 48, 48)",
  );
  await expect(page.getByRole("navigation")).toHaveCSS(
    "background-color",
    "rgb(146, 170, 225)",
  );
  await settings.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: "test-results/akasha-header-dark.png",
    fullPage: true,
  });
  await page.goto("/#mode");
  await expect(page.locator(".mode-card")).toHaveCSS(
    "background-color",
    "rgb(48, 48, 48)",
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
  await page.keyboard.press("Escape");
  await settings.click();
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
  await expect(page.locator(".player-header")).toHaveCSS(
    "background-color",
    "rgb(35, 72, 54)",
  );
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(243, 237, 223)",
  );
});
