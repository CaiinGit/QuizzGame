import { useRef } from "react";
import { PixelIcon } from "./PixelIcon";
import type { useAvatar } from "./avatar";

export type HeaderPanel =
  "photo" | "level" | "coins" | "trophies" | "notifications";

export function PlayerHeader({
  photo,
  open,
  settings,
}: {
  photo: string | null;
  open: (panel: HeaderPanel) => void;
  settings: () => void;
}) {
  return (
    <header className="player-header" aria-label="Espace joueur">
      <button
        className="header-photo"
        aria-label="Changer la photo de profil"
        onClick={() => open("photo")}
      >
        {photo ? (
          <img src={photo} alt="Ta photo de profil" />
        ) : (
          <PixelIcon name="profile" size={38} />
        )}
        <span className="photo-edit-mark" aria-hidden="true">
          +
        </span>
      </button>
      <button
        className="header-level"
        aria-label="Niveau et progression, à venir"
        onClick={() => open("level")}
      >
        <span className="level-label">
          NIV. <strong>—</strong>
        </span>
        <span className="level-track" aria-hidden="true">
          <span />
        </span>
      </button>
      <div className="header-counters">
        <button aria-label="Pièces, à venir" onClick={() => open("coins")}>
          <PixelIcon name="coin" />
          <span aria-hidden="true">—</span>
        </button>
        <button aria-label="Trophées, à venir" onClick={() => open("trophies")}>
          <PixelIcon name="trophy" />
          <span aria-hidden="true">—</span>
        </button>
      </div>
      <div className="header-tools">
        <button aria-label="Réglages" onClick={settings}>
          <PixelIcon name="gear" size={28} />
        </button>
        <button
          aria-label="Notifications"
          onClick={() => open("notifications")}
        >
          <PixelIcon name="mail" size={28} />
        </button>
      </div>
    </header>
  );
}

export function PhotoEditor({
  avatar,
}: {
  avatar: ReturnType<typeof useAvatar>;
}) {
  const picker = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="photo-preview">
        {avatar.photo ? (
          <img src={avatar.photo} alt="Aperçu de ta photo de profil" />
        ) : (
          <PixelIcon name="profile" size={60} />
        )}
      </div>
      <p>
        Choisis une image dans ta galerie ou tes fichiers. Elle sera centrée
        dans un carré et conservée sur cet appareil.
      </p>
      {avatar.error && (
        <div className="notice error" role="alert">
          {avatar.error}
        </div>
      )}
      <input
        ref={picker}
        type="file"
        accept="image/*"
        aria-label="Choisir une photo de profil"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void avatar.update(file);
        }}
      />
      <button
        className="button primary"
        disabled={!avatar.ready || avatar.busy}
        onClick={() => picker.current?.click()}
      >
        {avatar.busy ? "Enregistrement…" : "Choisir une photo"}
      </button>
      {avatar.photo && (
        <button
          className="button secondary"
          disabled={avatar.busy}
          onClick={() => void avatar.update(null)}
        >
          Supprimer la photo
        </button>
      )}
      <span className="sr-only" role="status">
        {avatar.busy
          ? "Enregistrement de la photo"
          : avatar.photo
            ? "Photo enregistrée"
            : ""}
      </span>
    </>
  );
}

export const headerPanels = {
  photo: { title: "Ta photo de profil", text: "" },
  level: {
    title: "Niveaux & expérience",
    text: "Ta progression prendra place ici. Les niveaux et les règles d’XP seront définis prochainement.",
  },
  coins: {
    title: "Pièces",
    text: "Les pièces payantes arriveront plus tard. Aucun achat n’est disponible pour le moment.",
  },
  trophies: {
    title: "Trophées",
    text: "Tes trophées prendront place ici. Leur fonctionnement sera défini prochainement.",
  },
  notifications: {
    title: "Notifications",
    text: "Ta boîte de réception prendra place ici. Les notifications arriveront dans une prochaine étape.",
  },
};
