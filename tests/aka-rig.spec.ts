import { test, expect } from "@playwright/test";

test("Aka keeps the approved face, a static cloak, and looks toward each actual target", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await page.getByRole("button", { name: "Revoir la visite avec Aka" }).click();
  await expect(page.locator(".aka-tour")).not.toHaveClass(/aka-preparing/);
  const rig = page.locator(".aka-rig");
  const head = rig.locator(".aka-head-pose");
  await expect(rig.locator("img")).toHaveCount(7);
  expect(
    await rig
      .locator("img")
      .evaluateAll((images) =>
        images.every(
          (i) =>
            (i as HTMLImageElement).complete &&
            (i as HTMLImageElement).naturalWidth > 0,
        ),
      ),
  ).toBe(true);
  await expect(rig.locator(".aka-head img")).toHaveAttribute(
    "src",
    "/art/aka-rig-v4/head.webp",
  );
  await expect(rig.locator(".aka-eyes img")).toHaveAttribute(
    "src",
    "/art/aka-rig-v4/eyes.webp",
  );
  await expect(rig.locator(".aka-wing-left img")).toHaveAttribute(
    "src",
    "/art/aka-rig-v3/wingLeft.webp",
  );
  await expect(rig.locator("[class*=aka-arm], [class*=aka-cape]")).toHaveCount(
    0,
  );
  await expect(head).toHaveAttribute("data-look-x", "0");
  await expect(head).toHaveAttribute("data-look-y", "0");
  // The actual renderer provides the preview: identical head/eyes, no AI-redrawn face.
  await page.evaluate(() => {
    const source = document.querySelector(".aka-rig")!;
    const sheet = document.createElement("div");
    sheet.id = "aka-sprite-preview";
    sheet.style.cssText =
      "position:fixed;inset:0 auto auto 0;background:#f4efdf;padding:24px;display:grid;grid-template-columns:repeat(3,280px);gap:18px;z-index:999999;font:18px sans-serif;color:#234737";
    const poses = [
      ["Face — tête conservée", 0, 0],
      ["Regard à gauche", -1, 0],
      ["Regard à droite", 1, 0],
      ["Regard vers le haut", 0, -1],
      ["Regard vers le bas", 0, 1],
      ["Vers un bouton", 1, -1],
    ] as const;
    for (const [label, x, y] of poses) {
      const card = document.createElement("div");
      const clone = source.cloneNode(true) as HTMLElement;
      clone.style.cssText = "width:280px;height:280px";
      clone.classList.add("aka-rig-paused");
      const face = clone.querySelector(".aka-head-pose") as HTMLElement;
      face.style.setProperty("--aka-yaw", x * 16 + "deg");
      face.style.setProperty("--aka-pitch", -y * 13 + "deg");
      face.style.setProperty("--aka-tilt", x * 7 + "deg");
      face.style.setProperty("--aka-eye-x", x * 2 + "%");
      face.style.setProperty("--aka-eye-y", y * 2 + "%");
      card.append(clone);
      const caption = document.createElement("p");
      caption.textContent = label;
      caption.style.textAlign = "center";
      card.append(caption);
      sheet.append(card);
    }
    // Inside the dialog top layer, above the actual tour content.
    document.querySelector(".aka-tour")!.append(sheet);
  });
  await page.setViewportSize({ width: 1000, height: 850 });
  await page
    .locator("#aka-sprite-preview")
    .screenshot({ path: "test-results/aka-v5-sprites.png" });
  await page.locator("#aka-sprite-preview").evaluate((el) => el.remove());
  await page.setViewportSize({ width: 390, height: 844 });
  for (let step = 1; step < 6; step++) {
    await page.locator(".aka-next").click();
    await expect
      .poll(() =>
        page
          .locator(".aka-actor, .aka-head-pose")
          .evaluateAll((elements) =>
            elements.reduce(
              (total, el) =>
                total +
                el.getAnimations().filter((a) => a.playState === "running")
                  .length,
              0,
            ),
          ),
      )
      .toBe(0);
    const measured = await page.evaluate(() => {
      const actor = document
        .querySelector(".aka-actor")!
        .getBoundingClientRect();
      const target = document
        .querySelector('.aka-spotlight > rect[fill="none"]')!
        .getBoundingClientRect();
      const face = document.querySelector(".aka-head-pose") as HTMLElement;
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      return {
        x: Number(face.dataset.lookX),
        y: Number(face.dataset.lookY),
        expectedX: clamp(
          (target.x + target.width / 2 - actor.x - actor.width * 0.5) /
            actor.width,
        ),
        expectedY: clamp(
          (target.y + target.height / 2 - actor.y - actor.height * 0.36) /
            actor.height,
        ),
      };
    });
    expect(measured.x).toBeCloseTo(measured.expectedX, 2);
    expect(measured.y).toBeCloseTo(measured.expectedY, 2);
    expect(
      await rig
        .locator(".aka-body")
        .evaluate((el) => el.getAnimations({ subtree: true }).length),
    ).toBe(0);
    await expect(rig.locator(".aka-body")).toHaveCSS("transform", "none");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      rig.evaluate((el) => el.getAnimations({ subtree: true }).length),
    )
    .toBe(0);
  await page.getByRole("button", { name: "Étape précédente" }).click();
  await expect
    .poll(() =>
      rig.evaluate((el) => el.getAnimations({ subtree: true }).length),
    )
    .toBe(0);
  await page.getByRole("button", { name: "Passer la visite" }).click();
  await expect(rig).toHaveCount(0);
});

test("blinking has intermediate eyelids and stops with reduced motion", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    (window as any).akaBlinks = [];
    Element.prototype.animate = function (frames, options) {
      if (this.classList.contains("aka-eyelids"))
        (window as any).akaBlinks.push(frames);
      return animate.call(this, frames, options);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await page.getByRole("button", { name: "Revoir la visite avec Aka" }).click();
  await expect(page.locator(".aka-rig")).toBeVisible();
  await page.clock.runFor(6600);
  const blinks = await page.evaluate(() => (window as any).akaBlinks);
  expect(blinks.length).toBeGreaterThan(0);
  expect(blinks[0].map((frame: any) => frame.transform)).toEqual([
    "scaleY(1)",
    "scaleY(.5)",
    "scaleY(.06)",
    "scaleY(.5)",
    "scaleY(1)",
  ]);
  // Blink animations may finish between checks; inspect calls rather than a fleeting frame.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page.locator(".aka-eyelids").evaluate((el) => el.getAnimations().length),
    )
    .toBe(0);
  await page.getByRole("button", { name: "Passer la visite" }).click();
});
