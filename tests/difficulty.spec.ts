import { test, expect } from "@playwright/test";
import { createApp } from "../server/app";
import { connectDatabase } from "../server/database";
import { questions } from "../server/questions";
import { durations } from "../server/engine";

test("difficulty selection uses live counts and filters real solo and shared duel questions", async ({
  browser,
  baseURL,
}) => {
  const server = await createApp(await connectDatabase(), {
    privateAccess: false,
    origins: [new URL(baseURL!).origin],
    times: { ...durations, reading: 100, countdown: 150, question: 30000 },
  });
  await server.repository.db.query(
    "UPDATE akasha_questions SET difficulty='easy'",
  );
  for (const q of questions)
    await server.repository.questionBank.saveQuestion({
      ...q,
      id: `hard-${q.id}`,
      themeId: "one-piece",
      difficulty: "hard",
      status: "published",
    });
  await new Promise<void>((resolve) =>
    server.http.listen(0, "127.0.0.1", resolve),
  );
  const addr = server.http.address();
  const address = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
  const contexts = [];
  try {
    for (const mode of ["duel", "solo"]) {
      const context = await browser.newContext({
        viewport: { width: mode === "duel" ? 320 : 390, height: 844 },
      });
      contexts.push(context);
      await context.addInitScript(
        (server) =>
          localStorage.setItem(
            "CapacitorStorage.akasha.connection.v1",
            JSON.stringify({ server, credentials: null }),
          ),
        address,
      );
      const page = await context.newPage();
      await page.goto(`/#${mode === "duel" ? "one-piece" : "solo-one-piece"}`);
      await expect(page.getByRole("radio", { name: /^Toutes/ })).toBeChecked();
      await expect(page.getByRole("radio", { name: /^Facile/ })).toBeEnabled();
      await expect(
        page.getByRole("radio", { name: /^Professionnel/ }),
      ).toBeDisabled();
      await expect(
        page.getByRole("group", { name: "Choisis ta difficulté" }),
      ).toContainText("0 / 10 · Indisponible");
      await page.getByRole("radio", { name: /^Difficile/ }).check();
      if (mode === "solo") {
        await page
          .getByRole("button", { name: "Réglages", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Mode sombre", exact: true })
          .click();
        await page.keyboard.press("Escape");
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/difficulty-${mode}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", {
          name: mode === "solo" ? "Commencer en solo" : "Créer un duel",
          exact: true,
        })
        .click();
      await page.getByLabel("Ton pseudo", { exact: true }).fill(`Test${mode}`);
      await page
        .getByRole("button", { name: "Continuer", exact: true })
        .click();
      if (mode === "duel") {
        await expect(page.locator(".match-difficulty")).toHaveText(
          "Difficulté : Difficile",
        );
        const code = await page.getByTestId("room-code").innerText();
        const peerContext = await browser.newContext();
        contexts.push(peerContext);
        await peerContext.addInitScript(
          (server) =>
            localStorage.setItem(
              "CapacitorStorage.akasha.connection.v1",
              JSON.stringify({ server, credentials: null }),
            ),
          address,
        );
        const peer = await peerContext.newPage();
        await peer.goto("/#rejoindre");
        await peer.getByLabel("Code du salon").fill(code);
        await peer
          .getByRole("button", { name: "Rejoindre", exact: true })
          .click();
        await peer.getByLabel("Ton pseudo", { exact: true }).fill("Adversaire");
        await peer
          .getByRole("button", { name: "Continuer", exact: true })
          .click();
        await expect(peer.locator(".match-difficulty")).toHaveText(
          "Difficulté : Difficile",
        );
        expect(server.rooms.get(code)!.difficulty).toBe("hard");
        expect(
          server.rooms
            .get(code)!
            .questions.every((q) => q.id.startsWith("hard-")),
        ).toBe(true);
      } else {
        await expect(page.locator(".question-meta b")).toHaveText("01");
        const solo = [...server.rooms.values()].find((r) => r.mode === "solo")!;
        expect(solo.difficulty).toBe("hard");
        expect(solo.questions.every((q) => q.id.startsWith("hard-"))).toBe(
          true,
        );
      }
    }
  } finally {
    for (const context of contexts) await context.close();
    await server.close();
  }
});
