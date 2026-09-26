import { useEffect, useRef, useState } from "react";
import { Preferences } from "@capacitor/preferences";

const AVATAR_KEY = "akasha.avatar.v1";
const LIMIT = 12 * 1024 * 1024;

async function preparePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/"))
    throw new Error("Choisis un fichier image.");
  if (file.size > LIMIT)
    throw new Error(
      "Cette image est trop lourde. Choisis une photo de moins de 12 Mo.",
    );
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new Error(
        "Impossible de lire cette photo. Essaie une image JPG, PNG ou WebP.",
      );
    }
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 50_000_000
    )
      throw new Error(
        "Cette photo est trop grande. Choisis une version plus petite.",
      );
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 320;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Impossible de préparer cette photo sur cet appareil.");
    context.drawImage(
      image,
      (image.naturalWidth - size) / 2,
      (image.naturalHeight - size) / 2,
      size,
      size,
      0,
      0,
      320,
      320,
    );
    return canvas.toDataURL("image/webp", 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function useAvatar() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  useEffect(() => {
    let mounted = true;
    Preferences.get({ key: AVATAR_KEY })
      .then(({ value }) => {
        if (
          mounted &&
          value &&
          value.length < 1_000_000 &&
          /^data:image\/(webp|png);base64,[A-Za-z0-9+/]+=*$/.test(value)
        )
          setPhoto(value);
      })
      .catch(() => {
        if (mounted)
          setError(
            "Impossible de charger ta photo. Tu peux en choisir une nouvelle.",
          );
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  async function update(file: File | null) {
    if (!ready || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const next = file ? await preparePhoto(file) : null;
      try {
        if (next) await Preferences.set({ key: AVATAR_KEY, value: next });
        else await Preferences.remove({ key: AVATAR_KEY });
      } catch {
        throw new Error(
          "Impossible d’enregistrer la photo. Réessaie après avoir libéré de l’espace.",
        );
      }
      setPhoto(next);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer cette photo.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { photo, ready, busy, error, update };
}
