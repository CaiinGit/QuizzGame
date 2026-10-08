import { test, expect } from "@playwright/test";

test("rig keeps the cape behind connected arms and animates without replacing frames", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await page.getByRole("button", { name: "Revoir la visite avec Aka" }).click();
  await expect(page.locator(".aka-tour")).not.toHaveClass(/aka-preparing/);
  const rig = page.locator(".aka-rig");
  await expect(rig.locator("img")).toHaveCount(9);
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
  const order = await rig
    .locator(":scope > div")
    .evaluateAll((parts) => parts.map((p) => p.className));
  expect(order.findIndex((c) => c.includes("aka-cape"))).toBeLessThan(
    order.findIndex((c) => c.includes("aka-arm-left")),
  );
  expect(order.findIndex((c) => c.includes("aka-arm-right"))).toBeLessThan(
    order.findIndex((c) => c.includes("aka-body")),
  );
  const art = await rig
    .locator("img")
    .evaluateAll((images) => images.map((i) => (i as HTMLImageElement).src));
  await page.getByRole("button", { name: "Découvrir", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator(".aka-arm-right-gesture")
        .evaluate((el) => el.getAnimations().length),
    )
    .toBe(1);
  // Enlarge the exact in-app rig for visual inspection of shoulder/cape geometry.
  await page
    .locator(".aka-float")
    .evaluate((el) =>
      el.getAnimations().forEach((animation) => animation.pause()),
    );
  await page.locator(".aka-actor").evaluate((el) => {
    const style = (el as HTMLElement).style;
    style.width = "320px";
    style.height = "320px";
    style.transform = "translate(20px,130px)";
    style.transition = "none";
  });
  for (const time of [0, 300, 800, 1300, 1800]) {
    await rig.evaluate((el, time) => {
      for (const part of el.querySelectorAll("*"))
        for (const animation of part.getAnimations()) {
          animation.pause();
          animation.currentTime = part.className.includes("gesture") ? time : 0;
        }
    }, time);
    if (time === 300) {
      const lead = await rig.evaluate((el) => ({
        arm: new DOMMatrix(
          getComputedStyle(el.querySelector(".aka-arm-right-gesture")!)
            .transform,
        ).b,
        cape: new DOMMatrix(
          getComputedStyle(el.querySelector(".aka-cape-gesture")!).transform,
        ).a,
      }));
      expect(Math.abs(lead.arm)).toBeLessThan(0.001);
      expect(lead.cape).toBeLessThan(1);
    }
    await rig.screenshot({ path: `test-results/aka-rig-gesture-${time}.png` });
  }
  expect(
    await rig
      .locator("img")
      .evaluateAll((images) => images.map((i) => (i as HTMLImageElement).src)),
  ).toEqual(art);
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator(".aka-arm-left-gesture")
        .evaluate((el) => el.getAnimations().length),
    )
    .toBe(1);
  await rig.evaluate((el) => {
    for (const part of el.querySelectorAll("*"))
      for (const animation of part.getAnimations()) {
        animation.pause();
        animation.currentTime = part.className.includes("gesture") ? 800 : 0;
      }
  });
  await rig.screenshot({ path: "test-results/aka-rig-left-gesture.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
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
