import { test, expect, type Page } from "@playwright/test";

async function startSolo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page.getByRole("button", { name: "Solo", exact: true }).click();
  await page.getByRole("button", { name: "One Piece", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Rejoindre un ami", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Commencer en solo", exact: true })
    .click();
  await page.getByLabel("Ton pseudo", { exact: true }).fill("TestSolo");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.locator(".question-meta b")).toHaveText("01");
}

test("Solo completes alone, resumes on reload, and timer moves between integer seconds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startSolo(page);
  await expect(page.locator(".players .player")).toHaveCount(1);
  await expect(page.locator(".versus")).toHaveCount(0);
  await expect(page.getByTestId("room-code")).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  const samples = await page.locator(".time-track > div").evaluate(
    (el) =>
      new Promise<number[]>((resolve) => {
        const values: number[] = [];
        const started = performance.now();
        function sample() {
          values.push(new DOMMatrixReadOnly(getComputedStyle(el).transform).a);
          if (performance.now() - started < 240) requestAnimationFrame(sample);
          else resolve(values);
        }
        requestAnimationFrame(sample);
      }),
  );
  expect(new Set(samples).size).toBeGreaterThan(3);
  expect(samples.at(-1)!).toBeLessThan(samples[0]);
  await expect(page.locator(".question-points")).toHaveCount(0);
  const previousSeconds = Number(
    await page.getByRole("progressbar").getAttribute("aria-valuenow"),
  );
  await page.reload();
  await expect(page.locator(".question-meta b")).toHaveText("01");
  const resumedSeconds = Number(
    await page.getByRole("progressbar").getAttribute("aria-valuenow"),
  );
  expect(resumedSeconds).toBeLessThanOrEqual(previousSeconds);
  await page.screenshot({
    path: "test-results/akasha-solo-question.png",
    fullPage: true,
  });
  for (let round = 1; round <= 10; round++) {
    await expect(page.locator(".question-meta b")).toHaveText(
      String(round).padStart(2, "0"),
    );
    await expect(page.locator(".answer").first()).toBeEnabled();
    await page.locator(".answer").first().click();
  }
  await expect(
    page.getByRole("heading", { name: "Partie terminée", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".results")).toContainText("Ton score");
  await expect(page.locator(".review-round")).toHaveCount(10);
  await expect(
    page.locator(".review-round").first().locator(".review-answer"),
  ).toHaveCount(1);
  await expect(page.locator(".results")).not.toContainText(
    /Victoire|Égalité|revanche/,
  );
  await page.screenshot({
    path: "test-results/akasha-solo-result.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Retour à l’accueil", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Jouer", exact: true }),
  ).toBeVisible();
});

test("Solo timeout advances without a guest and quitting does not promise a winner", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startSolo(page);
  await expect(page.locator(".question-section")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".round-feedback.timeout")).toContainText(
    "Temps écoulé",
    { timeout: 7000 },
  );
  await expect(page.locator(".question-meta b")).toHaveText("02", {
    timeout: 10000,
  });
  await expect(page.locator(".score")).toContainText("0");
  await page.getByRole("button", { name: "Quitter", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Quitter la partie ?", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).not.toContainText(
    /ami|adversaire|abandon/,
  );
  await page
    .getByRole("button", { name: "Quitter la partie", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Jouer", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Jouer", exact: true }),
  ).toBeVisible();
});
