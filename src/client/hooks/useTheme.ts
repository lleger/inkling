import { useState, useEffect, useCallback } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

export function useTheme(preference: ThemePreference) {
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(preference));

  useEffect(() => {
    const applied = resolveTheme(preference);
    setResolved(applied);
    document.documentElement.classList.toggle("dark", applied === "dark");
  }, [preference]);

  // Listen for system theme changes when preference is "system"
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const applied = resolveTheme("system");
      setResolved(applied);
      document.documentElement.classList.toggle("dark", applied === "dark");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  return resolved;
}
