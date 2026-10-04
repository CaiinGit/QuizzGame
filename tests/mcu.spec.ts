import { test, expect } from "@playwright/test";
import { createApp } from "../server/app";
import { connectDatabase } from "../server/database";
import { durations } from "../server/engine";

test("MCU stays unavailable until published, supports favorites, and keeps its theme through a complete solo game and history", async ({
  page,
  baseURL,
}) => {
  const server = await createApp(await connectDatabase(), {
    privateAccess: false,
    testMode: true,
    origins: [new URL(baseURL!).origin],
    times: { ...durations, countdown: 120, question: 10000, reveal: 100 },
  });
  try {
    const account = await server.repository.accounts.register({
      username: "mcureader",
      password: "McuTest!2026",
    });
    await new Promise<void>((resolve) =>
      server.http.listen(0, "127.0.0.1", resolve),
    );
    const addr = server.http.address();
    const address = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
    await page.addInitScript(
      (profile) =>
        localStorage.setItem(
          "CapacitorStorage.akasha.connection.v1",
          JSON.stringify(profile),
        ),
      { server: address, credentials: account.credentials },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/#classique");
    await expect(
      page.getByRole("button", { name: "MCU", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Ajouter MCU aux favoris", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Retirer MCU des favoris",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({
      path: "test-results/mcu-themes-light.png",
      fullPage: true,
    });
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Accueil", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Thème favori 1, MCU", exact: true })
      .click();
    await page.getByRole("button", { name: "Solo", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "MCU", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Toutes/ })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Commencer en solo", exact: true }),
    ).toBeDisabled();
    // Ensure switching themes cannot reuse One Piece availability.
    await page.goto("/#one-piece");
    await expect(
      page.getByRole("button", { name: "Créer un duel", exact: true }),
    ).toBeEnabled();
    await page.goto("/#solo-mcu");
    await expect(
      page.getByRole("button", { name: "Commencer en solo", exact: true }),
    ).toBeDisabled();
    for (let i = 0; i < 10; i++)
      await server.repository.questionBank.saveQuestion({
        id: `mcu-ui-${i}`,
        themeId: "mcu",
        text: `Question MCU de test ${i + 1}`,
        choices: ["A", "B", "C", "D"],
        correct: 0,
        difficulty: "easy",
        status: "published",
      });
    await page.reload();
    await expect(page.getByRole("radio", { name: /^Facile/ })).toBeEnabled();
    await page.getByRole("radio", { name: /^Facile/ }).check();
    await page.getByRole("button", { name: "Réglages", exact: true }).click();
    await page
      .getByRole("button", { name: "Mode sombre", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: "test-results/mcu-difficulty-dark.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Commencer en solo", exact: true })
      .click();
    for (let round = 1; round <= 10; round++) {
      await expect(page.locator(".question-meta b")).toHaveText(
        String(round).padStart(2, "0"),
      );
      await expect(page.locator(".question-title")).toContainText(
        "Question MCU de test",
      );
      await expect(page.locator(".answer").first()).toBeEnabled();
      await page.locator(".answer").first().click();
    }
    await expect(
      page.getByRole("heading", { name: "Partie terminée", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".duel-nav")).toContainText("MCU");
    await page
      .getByRole("button", { name: "Retour à l’accueil", exact: true })
      .click();
    await page.goto("/#historique");
    await expect(page.locator(".history-card").first()).toContainText("MCU");
    await page.locator(".history-card").first().click();
    await expect(
      page.getByRole("heading", { name: "Solo · MCU", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".review-round")).toHaveCount(10);
    expect(
      (await server.repository.accounts.profile(account.credentials.id))
        ?.favorites,
    ).toContain("mcu");
  } finally {
    await server.close();
  }
});
