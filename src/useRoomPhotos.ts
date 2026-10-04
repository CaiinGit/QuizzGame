import { useEffect, useState, type RefObject } from "react";
import { command, type DuelSocket, type Profile } from "./client";
import type { RoomPhotos, RoomView } from "../shared/protocol";

export function useRoomPhotos(
  socket: RefObject<DuelSocket | null>,
  room: RoomView | null,
  profile: Profile | null,
  online: boolean,
) {
  const code = room?.code;
  const members = room?.players.map((p) => p.id).join(":");
  const key = `${profile?.server}:${profile?.credentials?.id}:${room?.matchId ?? code}:${members}`;
  const [cache, setCache] = useState<{
    key: string;
    photos: RoomPhotos["photos"];
  } | null>(null);
  useEffect(() => {
    const connection = socket.current;
    if (!connection || !code || !online) return;
    let disposed = false,
      request = 0,
      retries = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      clearTimeout(retry);
      const sequence = ++request;
      try {
        const result = await command<RoomPhotos>(connection, "room:photos", {
          code,
        });
        if (!disposed && sequence === request && result.code === code) {
          setCache({ key, photos: result.photos });
          retries = 0;
        }
      } catch {
        if (
          !disposed &&
          sequence === request &&
          connection.connected &&
          retries++ < 2
        )
          retry = setTimeout(() => void load(), 3000);
      }
    };
    const changed = (event: { code: string }) => {
      if (event.code === code) void load();
    };
    connection.on("room:photos-changed", changed);
    connection.on("connect", load);
    void load();
    return () => {
      disposed = true;
      clearTimeout(retry);
      connection.off("room:photos-changed", changed);
      connection.off("connect", load);
    };
  }, [socket, code, key, online, profile?.credentials?.token]);
  return cache?.key === key ? cache.photos : {};
}
