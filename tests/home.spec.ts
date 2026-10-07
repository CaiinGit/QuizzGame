import { test, expect } from "@playwright/test";

test("home puts daily challenge and three empty favorites above the portal", async ({
  page,
}) => {
  await page.goto("/");
  const daily = page.getByRole("button", { name: "Défi du jour", exact: true });
  const favorites = page.getByRole("group", { name: "Thèmes favoris" });
  const play = page.getByRole("button", { name: "Jouer", exact: true });
  await expect(play).toBeVisible();
  await expect(page.locator(".home-play")).toHaveCount(0);
  await expect(page.locator(".akasha-portal")).toHaveCSS(
    "--portal-energy",
    "#5fac7c",
  );
  await expect(daily).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choisir un mode" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Rejoindre un ami" }),
  ).toHaveCount(0);
  await expect(favorites.getByRole("button")).toHaveCount(3);
  await expect(favorites.getByRole("button")).toHaveText(["", "", ""]);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const dailyBox = (await daily.boundingBox())!;
    const favoritesBox = (await favorites.boundingBox())!;
    const portalBox = (await page.locator(".portal-stage").boundingBox())!;
    const navBox = (await page.getByRole("navigation").boundingBox())!;
    const playBox = (await play.boundingBox())!;
    expect(playBox.y).toBeGreaterThanOrEqual(
      favoritesBox.y + favoritesBox.height,
    );
    expect(playBox.y + playBox.height).toBeLessThanOrEqual(navBox.y);
    await expect(play).toBeInViewport({ ratio: 1 });
    expect(dailyBox.y + dailyBox.height).toBeLessThanOrEqual(favoritesBox.y);
    expect(favoritesBox.y + favoritesBox.height).toBeLessThanOrEqual(
      portalBox.y,
    );
    expect(portalBox.y + portalBox.height).toBeLessThanOrEqual(navBox.y);
    const artBox = (await page.locator(".portal-art").boundingBox())!;
    expect(artBox.y + artBox.height).toBeLessThanOrEqual(navBox.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await daily.click();
  await expect(
    page.getByRole("dialog").getByText("À venir", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  for (let i = 0; i < 3; i++) {
    const slot = favorites.getByRole("button").nth(i);
    await slot.click();
    await expect(
      page.getByRole("heading", { name: "Choisis ton thème" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Ajouter One Piece aux favoris",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Accueil", exact: true })
      .click();
  }
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: "test-results/akasha-home-shortcuts-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await page.getByRole("button", { name: "Mode sombre", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(favorites.getByRole("button").first()).toHaveCSS(
    "--tile-face",
    "#ffa800",
  );
  await expect(page.locator(".akasha-portal")).toHaveCSS(
    "--portal-energy",
    "#ffa800",
  );
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: "test-results/akasha-home-shortcuts-dark.png",
    fullPage: true,
  });
  await play.click();
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await expect(play).toBeVisible();
});

test("only the portal opening starts entry; cancelling and returning allow another entry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "startViewTransition", {
      value: undefined,
    });
  });
  await page.goto("/");
  const art = page.locator(".portal-stage .portal-art");
  const bounds = (await art.boundingBox())!;
  const scale = Math.min(bounds.width / 600, bounds.height / 800);
  const left = bounds.x + (bounds.width - 600 * scale) / 2;
  const top = bounds.y + (bounds.height - 800 * scale) / 2;
  await page.mouse.click(left + 80 * scale, top + 480 * scale);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const play = page.getByRole("button", { name: "Jouer", exact: true });
  await play.click();
  await expect(
    page.getByRole("dialog", { name: "Entrée dans le portail" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toHaveCount(0);
  const zoom = page.locator(".portal-camera");
  const before = await zoom.evaluate((el) => getComputedStyle(el).transform);
  await expect
    .poll(() => zoom.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(before);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await play.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await play.focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toBeVisible();
});

test("reduced motion skips the zoom, and leaving home cancels pending entry", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => {
    location.hash = "amis";
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.waitForTimeout(1000);
  expect(new URL(page.url()).hash).toBe("#amis");
});

for (const theme of ["light", "dark"]) {
  test(`portal light stays mounted across navigation and reveals modes gradually (${theme})`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(document, "startViewTransition", {
        value: undefined,
      });
    });
    await page.goto("/");
    if (theme === "dark") {
      await page.getByRole("button", { name: "Réglages", exact: true }).click();
      await page
        .getByRole("button", { name: "Mode sombre", exact: true })
        .click();
      await page.keyboard.press("Escape");
    }
    await page.getByRole("button", { name: "Jouer", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Entrée dans le portail" });
    const original = await dialog.elementHandle();
    await expect(page.locator(".portal-camera")).toHaveCount(1);
    await expect(page.locator(".portal-stage .portal-current")).toHaveCSS(
      "animation-play-state",
      "paused",
    );
    // Finish the covering animation, then inspect the new screen during the fade.
    await page
      .locator(".portal-entry-light")
      .evaluate((el) => el.getAnimations()[0].finish());
    await expect(page.locator(".screen-mode")).toHaveCount(1);
    await expect(page.locator(".portal-camera")).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { includeHidden: true }),
    ).toHaveCSS("position", "fixed");
    expect(
      await original!.evaluate(
        (el) => el === document.querySelector(".portal-entry"),
      ),
    ).toBe(true);
    const light = page.locator(".portal-entry-light");
    await light.evaluate((el) => {
      const animation = el.getAnimations()[0];
      animation.pause();
      animation.currentTime = 175;
    });
    const opacity = await light.evaluate((el) =>
      Number(getComputedStyle(el).opacity),
    );
    expect(opacity).toBeGreaterThan(0.2);
    expect(opacity).toBeLessThan(0.8);
    await page.screenshot({ path: `test-results/portal-reveal-${theme}.png` });
    await light.evaluate((el) => el.getAnimations()[0].finish());
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Choisis ton mode" }),
    ).toBeFocused();
  });
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`the whole home follows the portal camera without a navigation jump (${viewport.width})`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(document, "startViewTransition", {
        value: undefined,
      });
    });
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    const selectors = [
      ".player-header",
      ".home-shortcuts",
      ".portal-stage .portal-art",
      ".bottom-nav",
    ];
    const before = await Promise.all(
      selectors.map((selector) => page.locator(selector).boundingBox()),
    );
    await page.getByRole("button", { name: "Jouer", exact: true }).click();
    const camera = page.locator(".portal-camera");
    await page.locator(".portal-entry-light").evaluate((el) => {
      const animation = el.getAnimations()[0];
      animation.pause();
      animation.currentTime = 100;
    });
    await camera.evaluate((el) => {
      const animation = el.getAnimations()[0];
      animation.pause();
      animation.currentTime = 0;
    });
    for (let i = 0; i < selectors.length; i++) {
      const box = (await page.locator(selectors[i]).boundingBox())!;
      expect(box.x).toBeCloseTo(before[i]!.x, 0);
      expect(box.y).toBeCloseTo(before[i]!.y, 0);
    }
    await camera.evaluate((el) => {
      el.getAnimations()[0].currentTime = 100;
    });
    const factor = await camera.evaluate(
      (el) => new DOMMatrix(getComputedStyle(el).transform).a,
    );
    expect(factor).toBeGreaterThan(1.05);
    for (let i = 0; i < selectors.length; i++) {
      const box = (await page.locator(selectors[i]).boundingBox())!;
      expect(box.width / before[i]!.width).toBeCloseTo(factor, 2);
      expect(Math.abs(box.y - before[i]!.y)).toBeGreaterThan(1);
    }
    await page.screenshot({
      path: `test-results/portal-camera-${viewport.width}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(camera).toHaveCount(0);
    await expect(page.locator(".app-shell")).toHaveCSS("transform", "none");
    await expect(page.getByRole("navigation")).toHaveCSS("position", "fixed");
    await expect(
      page.getByRole("button", { name: "Jouer", exact: true }),
    ).toBeInViewport();
  });
}

for (const theme of ["light", "dark"]) {
  test(`native snapshot moves the whole viewport while live UI stays still (${theme})`, async ({
    page,
  }) => {
    await page.goto("/");
    if (theme === "dark") {
      await page.getByRole("button", { name: "Réglages", exact: true }).click();
      await page
        .getByRole("button", { name: "Mode sombre", exact: true })
        .click();
      await page.keyboard.press("Escape");
    }
    await page.getByRole("button", { name: "Jouer", exact: true }).click();
    await page.waitForFunction(() => {
      const animations = document
        .getAnimations()
        .filter((a) =>
          (a as CSSAnimation).animationName?.startsWith("portal-snapshot-"),
        );
      if (animations.length < 3) return false;
      animations.forEach((a) => {
        a.pause();
        a.currentTime = 250;
      });
      return true;
    });
    await expect(page.locator(".app-shell")).toHaveCSS("transform", "none");
    await expect(page.locator(".bottom-nav")).toHaveCSS("position", "fixed");
    const scale = await page.evaluate(
      () =>
        new DOMMatrix(
          getComputedStyle(
            document.documentElement,
            "::view-transition-old(root)",
          ).transform,
        ).a,
    );
    expect(scale).toBeGreaterThan(1.1);
    await page.screenshot({
      path: `test-results/portal-snapshot-camera-${theme}.png`,
    });
    await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) =>
          (a as CSSAnimation).animationName?.startsWith("portal-snapshot-"),
        )
        .forEach((a) => {
          a.currentTime = 825;
        }),
    );
    const opacity = await page.evaluate(() =>
      Number(
        getComputedStyle(
          document.documentElement,
          "::view-transition-new(root)",
        ).opacity,
      ),
    );
    expect(opacity).toBeGreaterThan(0.2);
    expect(opacity).toBeLessThan(0.8);
    await page.screenshot({
      path: `test-results/portal-snapshot-reveal-${theme}.png`,
    });
    await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) =>
          (a as CSSAnimation).animationName?.startsWith("portal-snapshot-"),
        )
        .forEach((a) => a.finish()),
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Choisis ton mode" }),
    ).toBeFocused();
    await expect(page.locator("html")).not.toHaveClass(
      /portal-snapshot-active/,
    );
  });
}

test("native snapshot can be cancelled and entered again", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Jouer", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .some(
        (a) => (a as CSSAnimation).animationName === "portal-snapshot-camera",
      ),
  );
  await expect(
    page.getByRole("heading", { name: "Choisis ton mode" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
