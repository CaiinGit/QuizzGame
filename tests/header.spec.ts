import { test, expect } from "@playwright/test";

test("player header fits small phones and future features do not invent balances", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Ouvrir mon profil" }),
  ).toBeVisible();
  await expect(page.locator(".wordmark")).toHaveCount(0);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const parts = await page.locator(".player-header > *").all();
    let previousRight = 0;
    for (const part of parts) {
      const box = (await part.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(previousRight);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      previousRight = box.x + box.width;
    }
    const action = (await page
      .getByRole("group", { name: "Thèmes favoris", exact: true })
      .boundingBox())!;
    const nav = (await page.getByRole("navigation").boundingBox())!;
    expect(action.y + action.height).toBeLessThanOrEqual(nav.y);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/akasha-header-light.png",
    fullPage: true,
  });
  for (const label of [
    "Niveau et progression, à venir",
    "Pièces, à venir",
    "Trophées, à venir",
    "Notifications",
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(
      page.getByRole("dialog").getByText("À venir", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: label, exact: true }),
    ).toBeFocused();
  }
  await expect(page.locator(".header-counters button")).toHaveText(["—", "—"]);
});

test("photo selection, replacement, cancel and removal persist without server upload", async ({
  page,
}) => {
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") uploads.push(request.url());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ouvrir mon profil", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Profil", exact: true }),
  ).toBeVisible();
  const openPhoto = page.getByRole("button", {
    name: "Modifier ma photo",
    exact: true,
  });
  await openPhoto.click();
  const choose = page.getByRole("button", {
    name: "Choisir une photo",
    exact: true,
  });
  const picker = page.getByLabel("Choisir une photo de profil", {
    exact: true,
  });
  const chooserPromise = page.waitForEvent("filechooser");
  await choose.click();
  await (await chooserPromise).setFiles("public/art/one-piece-island.webp");
  await expect(page.getByRole("status")).toHaveText("Photo enregistrée");
  const first = await page.locator(".header-photo img").getAttribute("src");
  expect(first).toMatch(/^data:image\/webp;base64,/);
  await expect
    .poll(() =>
      page
        .locator(".header-photo img")
        .evaluate((img: HTMLImageElement) => [
          img.naturalWidth,
          img.naturalHeight,
        ]),
    )
    .toEqual([320, 320]);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator(".header-photo img")).toHaveAttribute(
    "src",
    first!,
  );
  await page
    .getByRole("button", { name: "Ouvrir mon profil", exact: true })
    .click();
  await expect(page.locator(".profile-photo img")).toHaveAttribute(
    "src",
    first!,
  );
  await openPhoto.click();
  await picker.setInputFiles([]);
  await expect(page.locator(".header-photo img")).toHaveAttribute(
    "src",
    first!,
  );
  await picker.setInputFiles({
    name: "not-a-photo.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("invalid"),
  });
  await expect(page.getByRole("alert")).toContainText("fichier image");
  await expect(page.locator(".header-photo img")).toHaveAttribute(
    "src",
    first!,
  );
  await picker.setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("invalid"),
  });
  await expect(page.getByRole("alert")).toContainText("Impossible de lire");
  await expect(choose).toBeEnabled();
  await picker.setInputFiles("public/art/portal.webp");
  await expect(page.getByRole("status")).toHaveText("Photo enregistrée");
  await expect(page.locator(".header-photo img")).not.toHaveAttribute(
    "src",
    first!,
  );
  await page.getByRole("button", { name: "Supprimer la photo" }).click();
  await expect(page.locator(".header-photo img")).toHaveCount(0);
  await page.reload();
  await expect(openPhoto).toBeVisible();
  await expect(page.locator(".header-photo img")).toHaveCount(0);
  expect(uploads).toEqual([]);
});
