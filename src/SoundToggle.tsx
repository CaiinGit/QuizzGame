import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { playSound, saveSound, soundsEnabled, unlockSound } from "./sound";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(soundsEnabled);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        className="appearance-toggle"
        aria-label="Effets sonores"
        aria-pressed={enabled}
        data-sound="off"
        onClick={() => {
          const next = !enabled;
          setEnabled(next);
          setFailed(false);
          void saveSound(next).catch(() => setFailed(true));
          if (next) {
            unlockSound();
            playSound("navigate");
          }
        }}
      >
        {enabled ? (
          <Volume2 size={22} aria-hidden="true" />
        ) : (
          <VolumeX size={22} aria-hidden="true" />
        )}
        <span className="appearance-label">
          <strong>Effets sonores</strong>
          <small>{enabled ? "Activés · sons discrets" : "Désactivés"}</small>
        </span>
        <span className="appearance-switch" aria-hidden="true">
          <span />
        </span>
      </button>
      {failed && (
        <p role="status">
          Le réglage sonore est appliqué, mais n’a pas pu être mémorisé.
        </p>
      )}
    </>
  );
}
