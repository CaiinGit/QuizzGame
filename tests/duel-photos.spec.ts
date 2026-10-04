import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { createApp } from "../server/app";
import { connectDatabase } from "../server/database";
import { durations } from "../server/engine";

test("both duel players see saved opponent photos, including changes, removal and reconnect", async ({
  browser,
  baseURL,
}) => {
  const server = await createApp(await connectDatabase(), {
    privateAccess: false,
    testMode: true,
    origins: [new URL(baseURL!).origin],
    times: { ...durations, countdown: 100, reading: 100, question: 30000 },
  });
  const a = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const b = await browser.newContext({ viewport: { width: 360, height: 800 } });
  try {
    await new Promise<void>((resolve) =>
      server.http.listen(0, "127.0.0.1", resolve),
    );
    const addr = server.http.address();
    const address = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
    const image = async (background: string) =>
      `data:image/png;base64,${(
        await sharp({
          create: { width: 32, height: 32, channels: 3, background },
        })
          .png()
          .toBuffer()
      ).toString("base64")}`;
    const alice = await server.repository.accounts.register({
      username: "alice",
      password: "Avatar!2026",
    });
    const bob = await server.repository.accounts.register({
      username: "bob",
      password: "Avatar!2026",
    });
    const alicePhoto = await server.repository.accounts.updateProfile(
      alice.credentials.id,
      { photo: await image("#cc3333") },
    );
    const bobPhoto = await server.repository.accounts.updateProfile(
      bob.credentials.id,
      { photo: await image("#3355cc") },
    );
    for (const [context, account] of [
      [a, alice],
      [b, bob],
    ] as const) {
      await context.addInitScript(
        (profile) =>
          localStorage.setItem(
            "CapacitorStorage.akasha.connection.v1",
            JSON.stringify(profile),
          ),
        { server: address, credentials: account.credentials },
      );
    }
    const p = await a.newPage(),
      q = await b.newPage();
    await p.goto(`${baseURL}/#one-piece`);
    await p.getByRole("button", { name: "Créer un duel", exact: true }).click();
    const code = await p.getByTestId("room-code").innerText();
    await q.goto(`${baseURL}/#rejoindre`);
    await q.getByLabel("Code du salon").fill(code);
    await q.getByRole("button", { name: "Rejoindre", exact: true }).click();
    const opponent = (page: typeof p) =>
      page.locator(".players .player:not(.you) .avatar img");
    await expect(opponent(p)).toHaveAttribute("src", bobPhoto.photo!);
    await expect(opponent(q)).toHaveAttribute("src", alicePhoto.photo!);
    expect(
      await opponent(p).evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    ).toBe(true);
    await p.getByRole("button", { name: "Je suis prêt" }).click();
    await q.getByRole("button", { name: "Je suis prêt" }).click();
    await expect(p.locator(".answer").first()).toBeEnabled();
    await expect(opponent(p)).toHaveAttribute("src", bobPhoto.photo!);
    await expect(opponent(q)).toHaveAttribute("src", alicePhoto.photo!);
    const update = async (photo: string | null) => {
      const result = await fetch(address + "/api/account/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bob.credentials.token}`,
        },
        body: JSON.stringify({ photo }),
      });
      expect(result.status).toBe(200);
      return result.json();
    };
    const changed = await update(await image("#33aa55"));
    await expect(opponent(p)).toHaveAttribute("src", changed.photo);
    await expect(q.locator(".player.you .avatar img")).toHaveAttribute(
      "src",
      changed.photo,
    );
    await p.reload();
    await expect(opponent(p)).toHaveAttribute("src", changed.photo);
    await update(null);
    await expect(opponent(p)).toHaveCount(0);
    await expect(p.locator(".players .player:not(.you) .avatar")).toHaveText(
      "B",
    );
    await expect(opponent(q)).toHaveAttribute("src", alicePhoto.photo!);
    await p.screenshot({ path: "test-results/duel-opponent-photo.png" });
  } finally {
    await a.close();
    await b.close();
    await server.close();
  }
});
