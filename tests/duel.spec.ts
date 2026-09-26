import { test, expect, type Page } from "@playwright/test";
async function chooseTheme(page: Page) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Mode", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Classique, duel 1 contre 1", exact: true })
    .click();
  await page.getByRole("button", { name: "One Piece", exact: true }).click();
}
async function identify(page: Page, name: string) {
  await page.getByLabel("Ton pseudo", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
}
test("mode then theme creates a real duel; direct invite, profile and reconnect work", async ({
  browser,
}) => {
  test.setTimeout(60000);
  const a = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    b = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const p = await a.newPage(),
    q = await b.newPage();
  try {
    await p.goto("/");
    await p.getByRole("button", { name: "Réglages", exact: true }).click();
    await p.getByRole("button", { name: "Mode sombre", exact: true }).click();
    await p.keyboard.press("Escape");
    await chooseTheme(p);
    await p.getByRole("button", { name: "Créer un duel", exact: true }).click();
    await identify(p, "Luffy");
    await expect(p.getByTestId("room-code")).toBeVisible();
    await expect(p.getByTestId("room-code")).toHaveCSS(
      "color",
      "rgb(146, 170, 225)",
    );
    const code = await p.getByTestId("room-code").innerText();
    await expect(p.getByRole("navigation")).toHaveCount(0);
    await q.goto("/");
    await chooseTheme(q);
    await q
      .getByRole("button", { name: "Rejoindre un ami", exact: true })
      .click();
    await q.getByLabel("Code du salon").fill(code);
    await q.getByRole("button", { name: "Rejoindre", exact: true }).click();
    await identify(q, "Zoro");
    await expect(q.getByTestId("room-code")).toHaveText(code);
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
        await expect(p.getByRole("navigation")).toHaveCount(0);
      }
      await q.locator(".answer").first().click();
    }
    await expect(
      p.getByRole("heading", { name: "Égalité parfaite" }),
    ).toBeVisible();
    await expect(
      q.getByRole("heading", { name: "Égalité parfaite" }),
    ).toBeVisible();
    await p.getByRole("button", { name: "Retour à l’accueil" }).click();
    await expect(
      p.getByRole("button", { name: "Défi du jour", exact: true }),
    ).toBeVisible();
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Profil", exact: true })
      .click();
    await expect(p.getByRole("heading", { name: "Luffy" })).toBeVisible();
    await p.reload();
    await expect(p.getByRole("heading", { name: "Luffy" })).toBeVisible();
  } finally {
    await a.close();
    await b.close();
  }
});
test("home fits small phones and navigation follows mode then theme", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Défi du jour", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Prêt à relever|Prêt pour un duel|LE SAVOIR FAIT LA FORCE/),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "One Piece" })).toHaveCount(0);
  const art = page.locator(".portal-art");
  await expect(art).toBeVisible();
  await expect
    .poll(() =>
      art.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/akasha-03-accueil.png",
    fullPage: true,
  });
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const button = await page
        .getByRole("group", { name: "Thèmes favoris", exact: true })
        .boundingBox(),
      nav = await page.getByRole("navigation").boundingBox();
    expect(button!.y + button!.height).toBeLessThanOrEqual(nav!.y);
  }
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Mode", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/akasha-03-mode.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Classique, duel 1 contre 1" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Choisis ton thème" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Créer un duel" })).toHaveCount(
    0,
  );
  await page.screenshot({
    path: "test-results/akasha-03-themes.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "One Piece", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Créer un duel" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/akasha-03-one-piece.png",
    fullPage: true,
  });
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Choisis ton thème" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await page.getByText("Connexion au serveur", { exact: true }).click();
  await page.getByLabel("Adresse du serveur").fill("http://example.com");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("HTTPS");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("canceling identity creates no session; invalid invite stays recoverable", async ({
  page,
}) => {
  let sessions = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/session") && r.method() === "POST") sessions++;
  });
  await page.goto("/");
  await chooseTheme(page);
  await page.getByRole("button", { name: "Créer un duel" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(sessions).toBe(0);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Accueil", exact: true })
    .click();
  await chooseTheme(page);
  await page
    .getByRole("button", { name: "Rejoindre un ami", exact: true })
    .click();
  await page.getByLabel("Code du salon").fill("ZZZZZZ");
  await page.getByRole("button", { name: "Rejoindre", exact: true }).click();
  await identify(page, "Nami");
  await expect(page.getByRole("alert")).toContainText("Salon introuvable");
  await expect(
    page.getByRole("button", { name: "Rejoindre", exact: true }),
  ).toBeEnabled();
});

test("leaving a pending offline invitation cancels it before reconnect", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Profil", exact: true })
    .click();
  await page.getByRole("button", { name: "Choisir mon pseudo" }).click();
  await identify(page, "Robin");
  await expect(page.getByText("Connecté", { exact: true })).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Accueil", exact: true })
    .click();
  await chooseTheme(page);
  await context.setOffline(true);
  await expect(
    page.getByText("Connexion en cours…", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Créer un duel", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Connexion en cours");
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Choisis ton thème" }),
  ).toBeVisible();
  await context.setOffline(false);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Profil", exact: true })
    .click();
  await expect(page.getByText("Connecté", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Robin" })).toBeVisible();
  await expect(page.getByTestId("room-code")).toHaveCount(0);
});
