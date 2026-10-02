import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { Repository } from "./database";
import { UserError } from "./accounts";

export function accountRoutes(
  app: Express,
  repository: Repository,
  hooks: {
    allow: (key: string, max?: number, window?: number) => boolean;
    active: (id: string) => unknown;
    revoked: (id: string, token?: string) => void;
    updated: (id: string) => Promise<void>;
    adminOnly: boolean;
  },
) {
  const token = (req: Request) => {
    const value = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
    if (!/^[a-f0-9]{64}$/.test(value))
      throw new UserError("Connecte-toi à ton compte.", 401);
    return value;
  };
  const auth = async (req: Request) => {
    const player = await repository.authenticate(token(req));
    if (!player?.account)
      throw new UserError("Connecte-toi à ton compte.", 401);
    if (hooks.adminOnly && !player.isAdmin)
      throw new UserError(
        "Accès réservé aux administrateurs pendant les tests.",
        403,
      );
    if (
      player.mustChangePassword &&
      ![
        "/api/account/me",
        "/api/account/security",
        "/api/account/logout",
      ].includes(req.path)
    )
      throw new UserError(
        "Choisis ton mot de passe personnel avant de continuer.",
        403,
      );
    return player;
  };
  const route = (
    method: "get" | "post",
    path: string,
    fn: (req: Request, res: Response) => Promise<unknown>,
  ) =>
    app[method](path, async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      try {
        if (!hooks.allow(`account-api:${req.ip}`, 120))
          throw new UserError("Trop de demandes. Patiente une minute.", 429);
        const data = await fn(req, res);
        res.json(data);
      } catch (e) {
        const status =
          e instanceof UserError
            ? e.status
            : e instanceof z.ZodError
              ? 400
              : 503;
        res.status(status).json({
          error:
            e instanceof UserError
              ? e.message
              : e instanceof z.ZodError
                ? e.issues[0].message
                : "Service temporairement indisponible. Réessaie.",
        });
        if (status === 503)
          console.error(
            "Account API operation failed",
            (e as { code?: string }).code ?? "internal error",
          );
      }
    });
  function authLimit(req: Request, kind: string) {
    const username =
      typeof req.body?.username === "string"
        ? req.body.username.trim().toLowerCase().slice(0, 40)
        : "";
    if (
      !hooks.allow(`auth-ip:${req.ip}`, 30, 15 * 60000) ||
      !hooks.allow(`auth-user:${kind}:${username}`, 12, 15 * 60000)
    )
      throw new UserError("Trop de tentatives. Réessaie dans 15 minutes.", 429);
  }
  route("post", "/api/account/register", async (req) => {
    if (hooks.adminOnly)
      throw new UserError(
        "Les inscriptions sont fermées pendant les tests privés.",
        403,
      );
    authLimit(req, "register");
    const guest = req.headers.authorization
      ? await repository.authenticate(token(req))
      : null;
    if (guest?.account) throw new UserError("Tu possèdes déjà un compte.");
    if (guest && hooks.active(guest.id))
      throw new UserError("Termine ta partie avant de créer ton compte.");
    const result = await repository.accounts.register(req.body, guest);
    if (guest) hooks.revoked(guest.id);
    return result;
  });
  route("post", "/api/account/login", async (req) => {
    authLimit(req, "login");
    return repository.accounts.login(req.body, hooks.adminOnly);
  });
  route("post", "/api/account/recover", async (req) => {
    authLimit(req, "recover");
    const result = await repository.accounts.recover(req.body, hooks.adminOnly);
    hooks.revoked(result.profile.id);
    return result;
  });
  route("get", "/api/account/me", async (req) =>
    repository.accounts.profile((await auth(req)).id),
  );
  route("post", "/api/account/profile", async (req) => {
    const player = await auth(req);
    if (!hooks.allow(`profile:${player.id}`, 20))
      throw new UserError(
        "Patiente avant de modifier à nouveau ton profil.",
        429,
      );
    const result = await repository.accounts.updateProfile(player.id, req.body);
    await hooks.updated(player.id);
    return result;
  });
  route("post", "/api/account/security", async (req) => {
    authLimit(req, "security");
    const player = await auth(req);
    const result = await repository.accounts.security(player.id, req.body);
    hooks.revoked(player.id);
    return result;
  });
  route("post", "/api/account/logout", async (req) => {
    const player = await auth(req);
    if (hooks.active(player.id))
      throw new UserError("Quitte ta partie avant de te déconnecter.");
    await repository.accounts.logout(token(req));
    hooks.revoked(player.id, token(req));
    return { ok: true };
  });
  route("get", "/api/account/history", async (req) => {
    const player = await auth(req),
      offset = z.coerce
        .number()
        .int()
        .min(0)
        .max(1000000)
        .parse(req.query.offset ?? 0);
    return repository.history(player.id, offset);
  });
  route("get", "/api/account/reward/:id", async (req) => {
    const player = await auth(req);
    return repository.reward(
      player.id,
      z.string().max(100).parse(req.params.id),
    );
  });
  route("get", "/api/account/history/:id", async (req) => {
    const player = await auth(req);
    const result = await repository.historyDetail(
      player.id,
      z.string().max(100).parse(req.params.id),
    );
    if (!result) throw new UserError("Partie introuvable.", 404);
    return result;
  });
}
