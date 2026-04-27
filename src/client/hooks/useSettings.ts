import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsQuery, queryKeys } from "../lib/queries";
import { saveSettings } from "../lib/api";
import type { Settings } from "../types";

export type { Settings, AccentColor } from "../types";

const STORAGE_KEY = "inkling-settings";

const DEFAULTS: Settings = {
  theme: "system",
  accent: "green",
  defaultMode: "richtext",
  smartTypography: true,
  dailyNoteFolder: "Daily",
};

function getLocalCache(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

export function useSettings() {
  const qc = useQueryClient();
  const [settings, setSettings] = useState<Settings>(getLocalCache);
  const { data: remote, isSuccess } = useQuery(settingsQuery());

  // Hydrate from server when fetched
  useEffect(() => {
    if (isSuccess && remote && Object.keys(remote).length > 0) {
      const merged = { ...DEFAULTS, ...remote } as Settings;
      setSettings(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
  }, [isSuccess, remote]);

  const update = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      saveSettings(next).catch(() => {});
      qc.setQueryData(queryKeys.settings, next);
      return next;
    });
  }, [qc]);

  return { settings, update, loaded: isSuccess };
}
