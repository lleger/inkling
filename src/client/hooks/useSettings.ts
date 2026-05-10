import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queries";
import { fetchSettings, saveSettings } from "../lib/api";
import { DEFAULT_DAILY_NOTE_TEMPLATE } from "../lib/daily-notes";
import type { Settings } from "../types";

export type { Settings, AccentColor } from "../types";

const STORAGE_KEY = "inkling-settings";

const DEFAULTS: Settings = {
  theme: "system",
  accent: "orange",
  defaultMode: "richtext",
  smartTypography: true,
  dailyNoteFolder: "Daily",
  dailyNoteTemplate: DEFAULT_DAILY_NOTE_TEMPLATE,
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
  const { data: settings = DEFAULTS, isFetched } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: async () => {
      const remote = await fetchSettings();
      const current = qc.getQueryData<Settings>(queryKeys.settings) ?? getLocalCache();
      const next =
        Object.keys(remote).length > 0 ? ({ ...DEFAULTS, ...remote } as Settings) : current;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    },
    initialData: getLocalCache,
    refetchOnMount: "always",
    staleTime: Infinity,
  });

  const { mutate: save } = useMutation({ mutationFn: saveSettings });

  const update = useCallback(
    (partial: Partial<Settings>) => {
      const current = qc.getQueryData<Settings>(queryKeys.settings) ?? settings;
      const next = { ...current, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      qc.setQueryData(queryKeys.settings, next);
      save(next);
    },
    [qc, save, settings],
  );

  return { settings, update, loaded: isFetched };
}
