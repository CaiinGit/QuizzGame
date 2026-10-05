import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { createApp } from "../server/app";
import { connectDatabase } from "../server/database";
import { Social } from "../server/social";
import { questions } from "../server/questions";

test("friends show live photos without difficulty controls, and invitations ignore the previous difficulty", async ({
  page,
  baseURL,
}) => {
  const db = await connectDatabase();
  const server = await createApp(db, {
    privateAccess: false,
    testMode: true,
    origins: [new URL(baseURL!).origin],
  });
  try {
    await new Promise<void>((resolve) =>
      server.http.listen(0, "127.0.0.1", resolve),
    );
    const addr = server.http.address();
    const address = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
    const accounts = server.repository.accounts;
    const alice = await accounts.register({
      username: "alice",
      password: "Avatar!2026",
    });
    const bob = await accounts.register({
      username: "bopin",
      password: "Avatar!2026",
    });
    const social = new Social(db);
    await social.request(alice.credentials.id, "bopin");
    const request = (await social.state(bob.credentials.id, new Set()))
      .incoming[0];
    await social.respond(bob.credentials.id, request.id, true);
    const bytes = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#5599cc" },
    })
      .png()
      .toBuffer();
    const photo = await accounts.updateProfile(bob.credentials.id, {
      photo: `data:image/png;base64,${bytes.toString("base64")}`,
    });
    for (let i = 0; i < 10; i++)
      await server.repository.questionBank.saveQuestion({
        ...questions[i],
        id: `hard-friends-${i}`,
        themeId: "one-piece",
        difficulty: "hard",
        status: "published",
      });
    await page.addInitScript(
      (profile) =>
        localStorage.setItem(
          "CapacitorStorage.akasha.connection.v1",
          JSON.stringify(profile),
        ),
      { server: address, credentials: alice.credentials },
    );
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/#one-piece");
    await page.getByRole("radio", { name: /^Difficile/ }).check();
    await page.evaluate(() => {
      location.hash = "amis";
    });
    await expect(
      page.getByRole("heading", { name: "Mes amis", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Choisis ta difficulté" }),
    ).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(0);
    const portrait = page.locator(".friend-card img");
    await expect(portrait).toHaveAttribute("src", photo.photo!);
    await expect(page.locator(".friend-card .button.primary")).toBeEnabled();
    await page.screenshot({
      path: "test-results/friends-photo-light.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Réglages", exact: true }).click();
    await page
      .getByRole("button", { name: "Mode sombre", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: "test-results/friends-photo-dark.png",
      fullPage: true,
    });
    const update = async (value: string | null) => {
      const response = await fetch(address + "/api/account/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bob.credentials.token}`,
        },
        body: JSON.stringify({ photo: value }),
      });
      expect(response.status).toBe(200);
    };
    await update(null);
    await expect(portrait).toHaveCount(0);
    await expect(page.locator(".friend-initial")).toHaveText("B");
    await update(photo.photo);
    await expect(portrait).toBeVisible();
    await page.reload();
    await expect(portrait).toBeVisible();
    await page.evaluate(() => {
      location.hash = "one-piece";
    });
    await page.getByRole("radio", { name: /^Difficile/ }).check();
    await page.evaluate(() => {
      location.hash = "amis";
    });
    await page.getByRole("button", { name: "Inviter", exact: true }).click();
    await expect(page.getByTestId("room-code")).toBeVisible();
    const code = await page.getByTestId("room-code").innerText();
    expect(server.rooms.get(code)!.difficulty).toBe("all");
    expect(server.rooms.get(code)!.themeId).toBe("one-piece");
  } finally {
    await server.close();
  }
});
