import { test, expect, type Page } from "@playwright/test";
import { observeAudio } from "./helpers/audio";
const password = "Akasha!8";
async function register(page: Page, username: string) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ouvrir mon profil", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Créer un compte", exact: true })
    .click();
  await page.getByLabel("Pseudo unique", { exact: true }).fill(username);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page
    .getByLabel("Confirmer le mot de passe", { exact: true })
    .fill(password);
  await page
    .getByRole("button", { name: "Créer mon compte", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ton code de secours" }),
  ).toBeVisible();
  const code = await page
    .getByLabel("Code de secours", { exact: true })
    .textContent();
  await page
    .getByRole("button", { name: "J’ai conservé mon code", exact: true })
    .click();
  await expect(page.getByText(`@${username}`, { exact: true })).toBeVisible();
  return code!;
}
async function login(page: Page, username: string, pass = password) {
  await page.goto("/#profil");
  await page.getByRole("button", { name: "Me connecter", exact: true }).click();
  await page.getByLabel("Pseudo unique", { exact: true }).fill(username);
  await page.getByLabel("Mot de passe", { exact: true }).fill(pass);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Me connecter", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("accounts sync profile and photo across devices, preserve recovery, and revoke old sessions", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const name = `photo_${Date.now().toString(36)}`;
  const a = await browser.newContext({ viewport: { width: 320, height: 640 } }),
    b = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await a.newPage(),
    q = await b.newPage();
  try {
    const recovery = await register(p, name);
    await p.getByLabel("Nom affiché", { exact: true }).fill("Capitaine Akasha");
    await p.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(
      p.getByRole("heading", { name: "Capitaine Akasha", exact: true }),
    ).toBeVisible();
    await p
      .getByRole("button", { name: "Modifier ma photo", exact: true })
      .click();
    await p
      .getByLabel("Choisir une photo de profil", { exact: true })
      .setInputFiles("public/art/portal.webp");
    await expect(p.getByRole("status")).toHaveText("Photo enregistrée");
    const photo = await p.locator(".header-photo img").getAttribute("src");
    await p.keyboard.press("Escape");
    await login(q, name);
    await expect(
      q.getByRole("heading", { name: "Capitaine Akasha", exact: true }),
    ).toBeVisible();
    await expect(q.locator(".header-photo img")).toHaveAttribute("src", photo!);
    await p.reload();
    await expect(p.locator(".header-photo img")).toHaveAttribute("src", photo!);
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await p.screenshot({
      path: "test-results/account-profile-light.png",
      fullPage: true,
    });
    await q
      .getByRole("button", { name: "Me déconnecter", exact: true })
      .click();
    await q
      .getByRole("button", { name: "Confirmer la déconnexion", exact: true })
      .click();
    await q.getByRole("button", { name: "Me connecter", exact: true }).click();
    await q
      .getByRole("button", { name: "Mot de passe oublié ?", exact: true })
      .click();
    await q.getByLabel("Pseudo unique", { exact: true }).fill(name);
    await q.getByLabel("Code de secours", { exact: true }).fill(recovery);
    await q
      .getByLabel("Nouveau mot de passe", { exact: true })
      .fill(password + " nouveau");
    await q
      .getByLabel("Confirmer le mot de passe", { exact: true })
      .fill(password + " nouveau");
    await q
      .getByRole("button", { name: "Récupérer mon compte", exact: true })
      .click();
    await expect(
      q.getByRole("heading", { name: "Ton code de secours" }),
    ).toBeVisible();
    await expect(
      q.getByLabel("Code de secours", { exact: true }),
    ).not.toHaveText(recovery);
    await q.keyboard.press("Escape");
    await expect(
      q.getByRole("heading", { name: "Ton code de secours" }),
    ).toBeVisible();
    await q
      .getByRole("button", { name: "J’ai conservé mon code", exact: true })
      .click();
    await expect(
      p.getByRole("button", { name: "Me connecter", exact: true }),
    ).toBeVisible();
    await q.reload();
    await expect(
      q.getByRole("heading", { name: "Capitaine Akasha", exact: true }),
    ).toBeVisible();
  } finally {
    await a.close();
    await b.close();
  }
});

test("round home friends button, friendship, direct invitation, match history and accepted rematch", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const suffix = Date.now().toString(36),
    alice = `ami_a_${suffix}`,
    bob = `ami_b_${suffix}`;
  const a = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    b = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const p = await a.newPage(),
    q = await b.newPage();
  try {
    await register(p, alice);
    await observeAudio(q);
    await register(q, bob);
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Accueil", exact: true })
      .click();
    const friends = p.getByRole("button", { name: "Mes amis", exact: true });
    await expect(friends).toBeVisible();
    const box = (await friends.boundingBox())!;
    expect(box.width).toBe(box.height);
    expect(box.x).toBeGreaterThan(250);
    await p.screenshot({
      path: "test-results/home-friends-light.png",
      fullPage: true,
    });
    await friends.click();
    await p.getByLabel("Ajouter un ami par son pseudo unique").fill(bob);
    await p.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect
      .poll(() =>
        q.evaluate(() => window.akashaTestSounds.some((note) => note === 1100)),
      )
      .toBe(true);
    await expect(
      p.getByRole("heading", { name: "Demandes envoyées" }),
    ).toBeVisible();
    await q
      .getByRole("navigation")
      .getByRole("button", { name: "Accueil", exact: true })
      .click();
    await expect(q.locator(".home-friends .social-badge")).toHaveText("1");
    await q.getByRole("button", { name: "Mes amis", exact: true }).click();
    await q
      .getByRole("button", { name: `Accepter ${alice}`, exact: true })
      .click();
    await expect(
      p.getByRole("button", { name: "Inviter", exact: true }),
    ).toBeVisible();
    await p.getByRole("button", { name: "Réglages", exact: true }).click();
    await p.getByRole("button", { name: "Mode sombre", exact: true }).click();
    await p.keyboard.press("Escape");
    await p.screenshot({
      path: "test-results/friends-dark.png",
      fullPage: true,
    });
    await p.getByRole("button", { name: "Inviter", exact: true }).click();
    await expect(p.getByTestId("room-code")).toBeVisible();
    await expect(q.locator(".friend-presence")).toHaveText("Dans un salon");
    await expect(
      q.getByRole("button", { name: "Occupé", exact: true }),
    ).toBeDisabled();
    await q.getByRole("button", { name: "Accepter", exact: true }).click();
    await expect(q.getByTestId("room-code")).toHaveText(
      await p.getByTestId("room-code").innerText(),
    );
    const first = await p.getByTestId("room-code").innerText();
    await p.getByRole("button", { name: "Je suis prêt", exact: true }).click();
    await q.getByRole("button", { name: "Je suis prêt", exact: true }).click();
    for (let round = 1; round <= 10; round++) {
      await expect(p.locator(".question-meta b")).toHaveText(
        String(round).padStart(2, "0"),
      );
      await expect(q.locator(".question-meta b")).toHaveText(
        String(round).padStart(2, "0"),
      );
      await p.locator(".answer").first().click();
      await q.locator(".answer").first().click();
    }
    await expect(
      p.getByRole("button", { name: "Revanche", exact: true }),
    ).toBeVisible();
    await expect(
      p.getByRole("region", { name: "Expérience gagnée" }),
    ).toBeVisible();
    await expect(p.locator(".result-player")).toHaveCount(2);
    await p.screenshot({
      path: "test-results/match-results-dark.png",
      fullPage: true,
    });
    await p.getByRole("button", { name: "Revanche", exact: true }).click();
    await expect(p.locator(".rematch-actions")).toContainText(
      "Invitation envoyée",
    );
    await expect(q.locator(".rematch-actions")).toContainText(alice);
    await q.getByRole("button", { name: "Refuser", exact: true }).click();
    await expect(
      p.getByRole("button", { name: "Revanche", exact: true }),
    ).toBeVisible();
    await p.getByRole("button", { name: "Revanche", exact: true }).click();
    await p
      .locator(".rematch-actions")
      .getByRole("button", { name: "Annuler", exact: true })
      .click();
    await expect(q.locator(".rematch-actions .invite-card")).toHaveCount(0);
    await p.getByRole("button", { name: "Revanche", exact: true }).click();
    await q.getByRole("button", { name: "Accepter", exact: true }).click();
    await expect(p.getByTestId("room-code")).not.toHaveText(first);
    await expect(q.getByTestId("room-code")).toHaveText(
      await p.getByTestId("room-code").innerText(),
    );
    await expect(p.locator(".players")).toContainText(alice);
    await expect(p.locator(".players")).toContainText(bob);
    await expect(p.locator(".player.is-ready")).toHaveCount(0);
    await p.getByRole("button", { name: "Quitter", exact: true }).click();
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "Quitter le duel", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Ouvrir mon profil", exact: true })
      .click();
    await p.getByRole("button", { name: "Mes parties", exact: true }).click();
    await expect(p.locator(".history-card")).toHaveCount(1);
    await p.locator(".history-card").click();
    await expect(
      p.getByRole("heading", { name: "Détail des réponses" }),
    ).toBeVisible();
    await expect(p.locator(".review-round")).toHaveCount(10);
    await p.screenshot({
      path: "test-results/account-history-dark.png",
      fullPage: true,
    });
  } finally {
    await a.close();
    await b.close();
  }
});

test("favorites sync between devices and retain the selected theme through both modes", async ({
  browser,
}) => {
  const a = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const b = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await a.newPage(),
    q = await b.newPage();
  try {
    const username = `fav_${Date.now().toString(36)}`;
    await register(p, username);
    await login(q, username);
    await q
      .getByRole("navigation")
      .getByRole("button", { name: "Accueil", exact: true })
      .click();
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Thèmes", exact: true })
      .click();
    await p
      .getByRole("button", {
        name: "Ajouter One Piece aux favoris",
        exact: true,
      })
      .click();
    const favorite = q.getByRole("button", {
      name: "Thème favori 1, One Piece",
      exact: true,
    });
    await expect(favorite).toBeVisible();
    await expect(
      p.getByRole("button", {
        name: "Retirer One Piece des favoris",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await p.screenshot({
      path: "test-results/theme-favorite-light.png",
      fullPage: true,
    });
    await q.screenshot({
      path: "test-results/home-favorite-light.png",
      fullPage: true,
    });
    await favorite.click();
    await expect(
      q.getByText("ONE PIECE · FAVORI", { exact: true }),
    ).toBeVisible();
    await q
      .getByRole("button", { name: "Classique, duel 1 contre 1", exact: true })
      .click();
    await expect(
      q.getByRole("button", { name: "Créer un duel", exact: true }),
    ).toBeVisible();
    await q
      .getByRole("navigation")
      .getByRole("button", { name: "Accueil", exact: true })
      .click();
    await favorite.click();
    await q.reload();
    await q.getByRole("button", { name: "Solo", exact: true }).click();
    await expect(
      q.getByRole("button", { name: "Commencer en solo", exact: true }),
    ).toBeVisible();
    await q
      .getByRole("navigation")
      .getByRole("button", { name: "Accueil", exact: true })
      .click();
    await q.getByRole("button", { name: "Réglages", exact: true }).click();
    await q.getByRole("button", { name: "Mode sombre", exact: true }).click();
    await q.keyboard.press("Escape");
    await q.screenshot({
      path: "test-results/home-favorite-dark.png",
      fullPage: true,
    });
    await p
      .getByRole("button", {
        name: "Retirer One Piece des favoris",
        exact: true,
      })
      .click();
    await expect(favorite).toHaveCount(0);
    await expect(
      q
        .getByRole("group", { name: "Thèmes favoris", exact: true })
        .getByRole("button"),
    ).toHaveCount(3);
    await q.reload();
    await expect(favorite).toHaveCount(0);
  } finally {
    await a.close();
    await b.close();
  }
});
