import { test, expect } from "@playwright/test";
import { questions } from "../src/data";

test("mobile: complete a perfect expedition, persist rewards, edit profile and filter themes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "À toi l’aventure." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Partir à l’aventure" }).click();
  await page.getByRole("button", { name: "Commencer l’aventure" }).click();
  await expect(page.getByRole("timer")).not.toHaveText("21 s");
  for (let i = 0; i < 10; i++) {
    const text = await page.locator("h1.question").innerText();
    const q = questions.find((q) => q.text === text)!;
    await page
      .getByRole("button")
      .filter({ hasText: q.choices[q.correct] })
      .click();
    await expect(page.getByRole("status")).toContainText("Bien vu");
    await page
      .getByRole("button", {
        name: i === 9 ? "Découvrir mes résultats" : "Question suivante",
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Un parcours parfait !" }),
  ).toBeVisible();
  await expect(page.getByText("+175 XP", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("+175 XP", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Revenir à l’aventure" }).click();
  await page
    .getByRole("navigation", { name: "Navigation mobile" })
    .getByRole("button", { name: "Mon héros" })
    .click();
  await page.getByLabel("Ton nom d’aventurier").fill("Caiin");
  await page.getByRole("button", { name: "Enregistrer mon nom" }).click();
  await page.reload();
  await expect(
    page.getByText("Bienvenue, Caiin.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navigation mobile" })
    .getByRole("button", { name: "Thèmes" })
    .click();
  await page.getByLabel("Chercher un thème").fill("One Piece");
  await expect(page.locator(".theme-card")).toHaveCount(1);
  await page.getByLabel("Chercher un thème").fill("Inexistant");
  await expect(
    page.getByRole("heading", { name: "Aucun univers trouvé" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("daily: resume after reload, timeout and abandonment do not restore the attempt", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: /Le défi du jour/ }).click();
  await page.getByRole("button", { name: "Commencer le défi" }).click();
  const text = await page.locator("h1.question").innerText();
  await page.reload();
  await expect(page.locator("h1.question")).toHaveText(text);
  await page.clock.fastForward(21000);
  await expect(page.getByRole("status")).toContainText("Le temps est écoulé");
  await page.getByRole("button", { name: "Quitter la partie" }).click();
  await page.getByRole("button", { name: "Abandonner la partie" }).click();
  await expect(
    page.getByRole("button", { name: /Le défi du jour/ }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Le défi du jour/ }),
  ).toBeDisabled();
});
test("survival ends after three errors; 320px screens have no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /Survie Trois vies/ }).click();
  await page.getByRole("button", { name: "Commencer l’aventure" }).click();
  for (let i = 0; i < 3; i++) {
    const text = await page.locator("h1.question").innerText();
    const q = questions.find((q) => q.text === text)!;
    await page.getByRole("button").filter({ hasText: q.choices[1] }).click();
    await page
      .getByRole("button", {
        name: i === 2 ? "Découvrir mes résultats" : "Question suivante",
      })
      .click();
  }
  await expect(page.getByText("sur 3 réponses", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("last favorite cannot be removed and untimed settings persist", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigation mobile" });
  await nav.getByRole("button", { name: "Thèmes" }).click();
  await page
    .getByRole("button", { name: "Retirer One Piece des favoris" })
    .click();
  await page
    .getByRole("button", { name: "Retirer Jeux vidéo des favoris" })
    .click();
  await page
    .getByRole("button", { name: "Retirer Géographie des favoris" })
    .click();
  await expect(
    page.getByRole("button", { name: "Retirer Géographie des favoris" }),
  ).toHaveAttribute("aria-pressed", "true");
  await nav.getByRole("button", { name: "Mon héros" }).click();
  await page.getByRole("checkbox", { name: /Chronomètre/ }).uncheck();
  await page.reload();
  await page.getByRole("button", { name: "Partir à l’aventure" }).click();
  await expect(page.getByText("Sans chrono", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Commencer l’aventure" }).click();
  await expect(page.getByRole("timer")).toHaveText("À ton rythme");
});
