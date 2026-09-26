import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { saveTheme, type Theme } from "./theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const [saveFailed, setSaveFailed] = useState(false);
  const dark = theme === "dark";
  return (
    <>
      <button
        className="appearance-toggle"
        aria-label="Mode sombre"
        aria-pressed={dark}
        title={dark ? "Passer en mode clair" : "Passer en mode sombre"}
        onClick={() => {
          const next = dark ? "light" : "dark";
          setTheme(next);
          setSaveFailed(false);
          void saveTheme(next).catch(() => setSaveFailed(true));
        }}
      >
        {dark ? (
          <Moon size={22} aria-hidden="true" />
        ) : (
          <Sun size={22} aria-hidden="true" />
        )}
        <span className="appearance-label">
          <strong>Mode sombre</strong>
          <small>{dark ? "Activé" : "Désactivé"}</small>
        </span>
        <span className="appearance-switch" aria-hidden="true">
          <span />
        </span>
      </button>
      {saveFailed && (
        <span className="theme-save-notice" role="status">
          Le thème est appliqué, mais n’a pas pu être mémorisé.
        </span>
      )}
    </>
  );
}
