import { test, expect } from "@playwright/test";
test("two phones finish the same real duel and can reconnect", async ({
  browser,
}) => {
  test.setTimeout(60000);
  const a = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    b = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const p = await a.newPage(),
    q = await b.newPage();
  try {
    for (const [page, name] of [
      [p, "Luffy"],
      [q, "Zoro"],
    ] as const) {
      await page.goto("/");
      await page.getByLabel("Ton nom d’aventurier").fill(name);
      await page.getByRole("button", { name: "Prendre le large" }).click();
      await expect(
        page.getByRole("button", { name: "Créer un duel" }),
      ).toBeEnabled();
    }
    await p.getByRole("button", { name: "Créer un duel" }).click();
    const code = await p.getByTestId("room-code").innerText();
    await q.getByLabel("Code du salon").fill(code);
    await q.getByRole("button", { name: "Rejoindre", exact: true }).click();
    await p.getByRole("button", { name: "Je suis prêt" }).click();
    await q.getByRole("button", { name: "Je suis prêt" }).click();
    for (let i = 1; i <= 10; i++) {
      await expect(p.locator(".question-meta b")).toHaveText(
        String(i).padStart(2, "0"),
      );
      await expect(q.locator(".question-meta b")).toHaveText(
        String(i).padStart(2, "0"),
      );
      await expect(p.locator(".question-title")).toHaveText(
        await q.locator(".question-title").innerText(),
      );
      await p.locator(".answer").first().click();
      await expect(p.locator(".answer").first()).toBeDisabled();
      if (i === 1) {
        await p.reload();
        await expect(p.locator(".answer.selected")).toHaveCount(1);
        await expect(p.locator(".answer").first()).toBeDisabled();
      }
      await q.locator(".answer").first().click();
    }
    await expect(
      p.getByRole("heading", { name: "Égalité parfaite" }),
    ).toBeVisible();
    await expect(
      q.getByRole("heading", { name: "Égalité parfaite" }),
    ).toBeVisible();
    await p.screenshot({
      path: "test-results/akasha-resultat.png",
      fullPage: true,
    });
    await p.getByRole("button", { name: "Retour à l’accueil" }).click();
    await expect(
      p.getByRole("button", { name: "Créer un duel" }),
    ).toBeVisible();
  } finally {
    await a.close();
    await b.close();
  }
});
test("mobile home has only One Piece duels and fits narrow screens", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "One Piece" })).toBeVisible();
  await page.screenshot({
    path: "test-results/akasha-accueil.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByText("Boutique", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Réglages de connexion" }).click();
  await page.getByLabel("Adresse du serveur").fill("http://example.com");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("HTTPS");
});
