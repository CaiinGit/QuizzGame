import { test, expect } from "@playwright/test";
import { createApp } from "../server/app";
import { connectDatabase } from "../server/database";
import { durations } from "../server/engine";
import { questions } from "../server/questions";

for (const variant of [
  "phone-dark",
  "desktop-light",
  "phone-reduced",
] as const) {
  test(`reading animation fits, resumes and repeats before the scoring clock: ${variant}`, async ({
    page,
    baseURL,
  }) => {
    const server = await createApp(await connectDatabase(), {
      privateAccess: false,
      testMode: true,
      origins: [new URL(baseURL!).origin],
      times: { ...durations, countdown: 100, reveal: 200 },
    });
    try {
      const longText =
        "Dans l’univers de One Piece, quel personnage accompagne l’équipage du Chapeau de paille et rêve de découvrir une mer légendaire réunissant les poissons de tous les océans ?";
      for (const question of questions)
        await server.repository.questionBank.saveQuestion({
          ...question,
          text: longText,
          themeId: "one-piece",
          status: "published",
        });
      await new Promise<void>((resolve) =>
        server.http.listen(0, "127.0.0.1", resolve),
      );
      const addr = server.http.address();
      const address = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
      const response = await fetch(address + "/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Lecture" }),
      });
      const credentials = await response.json();
      await page.addInitScript(
        (profile) =>
          localStorage.setItem(
            "CapacitorStorage.akasha.connection.v1",
            JSON.stringify(profile),
          ),
        { server: address, credentials },
      );
      await page.setViewportSize(
        variant === "desktop-light"
          ? { width: 1280, height: 900 }
          : { width: 320, height: 568 },
      );
      if (variant === "phone-reduced")
        await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/#solo-one-piece");
      if (variant === "phone-dark") {
        await page
          .getByRole("button", { name: "Réglages", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Mode sombre", exact: true })
          .click();
        await page.keyboard.press("Escape");
      }
      await page
        .getByRole("button", { name: "Commencer en solo", exact: true })
        .click();
      const intro = page.locator(".question-intro-title");
      await expect(intro).toHaveText(longText);
      await expect(page.locator(".answer")).toHaveCount(0);
      await expect(
        page.getByRole("progressbar", { name: "Temps restant" }),
      ).toHaveCount(0);
      await expect(page.locator(".question-intro-backdrop")).toHaveCSS(
        "backdrop-filter",
        "blur(7px)",
      );
      await expect(page.locator("main")).toHaveAttribute("inert", "");
      const box = (await intro.boundingBox())!,
        viewport = page.viewportSize()!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      await page.screenshot({
        path: `test-results/question-intro-${variant}.png`,
      });
      const room = [...server.rooms.values()][0];
      const initialDeadline = room.deadline;
      await page.reload();
      await expect(intro).toHaveText(longText);
      expect(server.rooms.get(room.code)!.deadline).toBe(initialDeadline);
      await expect(page.locator(".answer").first()).toBeEnabled();
      await expect(page.locator(".question-intro")).toHaveCount(0);
      await expect(page.locator(".question-title")).toBeVisible();
      const active = server.rooms.get(room.code)!;
      expect(active.phaseStartedAt).toBeGreaterThanOrEqual(initialDeadline);
      expect(active.phaseDuration).toBe(20000);
      const correct = active.questions[0].correct;
      await page.locator(".answer").nth(correct).click();
      await expect(page.locator(".round-feedback.right")).toBeVisible();
      expect(
        server.rooms.get(room.code)!.correction!.answers[credentials.id].points,
      ).toBeGreaterThan(900);
      await expect(intro).toHaveText(longText);
      expect(server.rooms.get(room.code)!.index).toBe(1);
      await expect(page.locator(".answer")).toHaveCount(0);
      await expect(page.locator(".answer").first()).toBeEnabled();
      expect(server.rooms.get(room.code)!.phaseDuration).toBe(20000);
    } finally {
      await server.close();
    }
  });
}
