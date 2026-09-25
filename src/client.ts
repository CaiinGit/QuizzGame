import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import { io } from "socket.io-client";
import type { Ack, Credentials } from "../shared/protocol";
export const PROFILE_KEY = "akasha.connection.v1";
export type Profile = { server: string; credentials: Credentials | null };
export function serverUrl(value: string) {
  const url = new URL(value.trim());
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error(
      "Utilise uniquement l’adresse du serveur, par exemple https://akasha.exemple.fr",
    );
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Le serveur doit utiliser HTTPS.");
  return url.origin;
}
export async function loadProfile(): Promise<Profile> {
  const fallback =
    (import.meta.env.VITE_SERVER_URL as string | undefined) ??
    (!Capacitor.isNativePlatform() ? window.location.origin : "");
  const { value } = await Preferences.get({ key: PROFILE_KEY });
  if (!value) return { server: fallback, credentials: null };
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed.server !== "string") throw Error();
    const c = parsed.credentials;
    if (
      c &&
      !(
        typeof c.id === "string" &&
        typeof c.name === "string" &&
        /^[a-f0-9]{64}$/.test(c.token)
      )
    )
      throw Error();
    return { server: parsed.server || fallback, credentials: c ?? null };
  } catch {
    return { server: fallback, credentials: null };
  }
}
export const saveProfile = (profile: Profile) =>
  Preferences.set({ key: PROFILE_KEY, value: JSON.stringify(profile) });
export async function createSession(
  server: string,
  name: string,
): Promise<Credentials> {
  const response = await fetch(`${server}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Serveur indisponible.");
  return data;
}
export const connect = (profile: Profile) =>
  io(profile.server, {
    auth: { token: profile.credentials!.token },
    reconnection: true,
    timeout: 10000,
    autoConnect: false,
  });
export type DuelSocket = ReturnType<typeof connect>;
export function command<T = undefined>(
  socket: DuelSocket | null,
  event: string,
  data: unknown = {},
): Promise<T> {
  if (!socket?.connected)
    return Promise.reject(
      new Error("Connexion interrompue. Attends la reconnexion."),
    );
  return new Promise((resolve, reject) =>
    socket
      .timeout(10000)
      .emit(event, data, (error: Error | null, result: Ack<T>) => {
        if (error)
          reject(
            new Error(
              "Le serveur ne répond pas. La connexion est en cours de rétablissement.",
            ),
          );
        else if (!result?.ok)
          reject(new Error(result?.error ?? "Action impossible."));
        else resolve(result.data);
      }),
  );
}
