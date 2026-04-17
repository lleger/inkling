import { useState, useEffect, useCallback } from "react";
import { fetchSettings, saveSettings } from "../lib/api";
import type { Settings } from "../types";

export type { Settings, AccentColor } from "../types";

const STORAGE_KEY = "writer-settings";

const DEFAULTS: Settings = {
  theme: "system",
  accent: "green",
  defaultMode: "richtext",
  smartTypography: true,
};

function getLocalCache(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(getLocalCache);
  const [loaded, setLoaded] = useState(false);

  // Load from API on mount
  useEffect(() => {
    fetchSettings()
      .then((remote) => {
        if (remote && Object.keys(remote).length > 0) {
          const merged = { ...DEFAULTS, ...remote } as Settings;
          setSettings(merged);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      // Write to localStorage immediately for instant feedback
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // Write to API in background
      saveSettings(next).catch(() => {});
      return next;
    });
  }, []);

  return { settings, update, loaded };
}
