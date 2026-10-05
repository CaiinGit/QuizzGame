import { useEffect, useState, type RefObject } from "react";
import { command, type DuelSocket, type Profile } from "./client";
import type { Friend, FriendPhotos } from "../shared/account";

export function useFriendPhotos(
  socket: RefObject<DuelSocket | null>,
  friends: Friend[],
  profile: Profile | null,
  enabled: boolean,
  online: boolean,
) {
  const versions = friends
    .map((f) => `${f.id}:${f.photoVersion ?? ""}`)
    .join(",");
  const key = `${profile?.server}:${profile?.credentials?.id}:${versions}`;
  const [cache, setCache] = useState<{
    key: string;
    photos: FriendPhotos;
  } | null>(null);
  useEffect(() => {
    const connection = socket.current;
    if (
      !enabled ||
      !online ||
      !connection ||
      !versions ||
      !profile?.credentials?.account
    )
      return;
    let disposed = false,
      attempts = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const photos = await command<FriendPhotos>(
          connection,
          "friends:photos",
        );
        if (!disposed) setCache({ key, photos });
      } catch {
        if (!disposed && connection.connected && attempts++ < 2)
          retry = setTimeout(() => void load(), 3000);
      }
    };
    void load();
    return () => {
      disposed = true;
      clearTimeout(retry);
    };
  }, [
    socket,
    key,
    versions,
    enabled,
    online,
    profile?.credentials?.account,
    profile?.credentials?.token,
  ]);
  return cache?.key === key ? cache.photos : {};
}
