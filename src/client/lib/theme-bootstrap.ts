import { applyAccent } from "./accent-colors";
import type { Settings } from "../types";

const STORAGE_KEY = "inkling-settings";

const DEFAULTS: Pick<Settings, "theme" | "accent"> = {
  theme: "system",
  accent: "orange",
};

/**
 * Apply theme + accent at app boot, *before* any route renders. Reads from
 * the localStorage cache that `useSettings` writes to so returning users
 * see their saved theme on the login page (which is rendered outside the
 * authed `/_app` shell). First-time visitors fall through to the system
 * preference + the default accent.
 *
 * Once the authed shell mounts, `useTheme` + `applyAccent` in `_app.tsx`
 * take over with live settings.
 */
export function bootstrapTheme() {
  const { theme, accent } = readCache();
  const resolved = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  applyAccent(accent, resolved);
}

function readCache(): Pick<Settings, "theme" | "accent"> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return {
        theme: parsed.theme ?? DEFAULTS.theme,
        accent: parsed.accent ?? DEFAULTS.accent,
      };
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULTS;
}
