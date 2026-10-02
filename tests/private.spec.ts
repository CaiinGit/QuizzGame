import { test, expect } from "@playwright/test";
import { createApp } from "../server/app";
import { connectDatabase } from "../server/database";
import { provisionAdmins } from "../server/admins";
import { durations } from "../server/engine";

test("private gate, first login, saved recovery, solo XP, level-up and logout", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(90000);
  const server = await createApp(await connectDatabase(), {
    origins: [new URL(baseURL!).origin],
    testMode: true,
    times: { ...durations, question: 10000, countdown: 120, reveal: 200 },
  });
  try {
    const admins = await provisionAdmins(server.repository, [
      "Caiin",
      "Bopin",
      "Superphantome",
    ]);
    await new Promise<void>((resolve) =>
      server.http.listen(0, "127.0.0.1", resolve),
    );
    const addr = server.http.address();
    const address = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
    await page.addInitScript((server) => {
      if (!localStorage.getItem("CapacitorStorage.akasha.connection.v1"))
        localStorage.setItem(
          "CapacitorStorage.akasha.connection.v1",
          JSON.stringify({ server, credentials: null }),
        );
    }, address);
    await page.goto("/#themes");
    await expect(
      page.getByRole("heading", { name: "Me connecter", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Jouer", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Créer un compte", exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 320, height: 640 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/private-login-light.png",
      fullPage: true,
    });
    await page.getByLabel("Pseudo unique", { exact: true }).fill("Caiin");
    await page
      .getByLabel("Mot de passe", { exact: true })
      .fill(admins[0].password!);
    await page
      .getByRole("button", { name: "Me connecter", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Sécurité du compte", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    const password = "Une longue phrase de test privée!";
    await page
      .getByLabel("Mot de passe actuel", { exact: true })
      .fill(admins[0].password!);
    await page
      .getByLabel("Nouveau mot de passe", { exact: true })
      .fill(password);
    await page
      .getByLabel("Confirmer le mot de passe", { exact: true })
      .fill(password);
    await page
      .getByRole("button", { name: "Changer le mot de passe", exact: true })
      .click();
    await expect(
      page.getByLabel("Code de secours", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await page
      .getByRole("button", { name: "J’ai conservé mon code", exact: true })
      .click();
    await expect(page.getByRole("navigation")).toBeVisible();
    await server.repository.db.query(
      "UPDATE akasha_accounts SET total_xp=170 WHERE username='caiin'",
    );
    await page.goto("/#accueil");
    await page.reload();
    await expect(
      page.getByRole("button", {
        name: "Niveau 1, 170 sur 200 XP",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Jouer", exact: true }).click();
    await page.getByRole("button", { name: "Solo", exact: true }).click();
    await page.getByRole("button", { name: "One Piece", exact: true }).click();
    // The theme screen offers a single solo start action.
    await page
      .getByRole("button", { name: /Commencer|Lancer.*solo|Jouer en solo/i })
      .click();
    for (let round = 1; round <= 10; round++) {
      await expect
        .poll(() =>
          [...server.rooms.values()].some(
            (r) => r.phase === "question" && r.index === round - 1,
          ),
        )
        .toBe(true);
      const room = [...server.rooms.values()].find(
        (r) => r.phase === "question",
      )!;
      await expect(page.locator(".answer").first()).toBeEnabled();
      await page
        .locator(".answer")
        .nth(room.questions[room.index].correct)
        .click();
    }
    await expect(
      page.getByRole("heading", { name: "+130 XP", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Niveau 2 atteint !", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Niveau 2, 100 sur 250 XP",
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/private-xp-light.png",
      fullPage: true,
    });
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    await page.screenshot({
      path: "test-results/private-xp-dark.png",
      fullPage: true,
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "+130 XP", exact: true }),
    ).toBeVisible();
    expect(
      (
        await server.repository.db.query<{ total_xp: number }>(
          "SELECT total_xp FROM akasha_accounts WHERE username='caiin'",
        )
      ).rows[0].total_xp,
    ).toBe(300);
    await page
      .getByRole("button", { name: "Retour à l’accueil", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Ouvrir mon profil", exact: true })
      .click();
    const soloStats = page.getByRole("region", {
      name: "Statistiques Solo",
      exact: true,
    });
    await expect(soloStats).toContainText("100 %");
    await expect(soloStats).toContainText(
      "10 bonnes réponses sur 10 questions corrigées.",
    );
    await expect(
      page.getByRole("region", { name: "Statistiques Duel", exact: true }),
    ).toContainText(
      "Tes statistiques apparaîtront après tes premières parties.",
    );
    await page.screenshot({
      path: "test-results/profile-statistics-light.png",
      fullPage: true,
    });
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    await page.screenshot({
      path: "test-results/profile-statistics-dark.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Me déconnecter", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmer la déconnexion", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Me connecter", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
  } finally {
    await server.close();
  }
});
