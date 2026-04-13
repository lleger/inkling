import type { AccentColor } from "../hooks/useSettings";

interface AccentPair {
  light: string;
  dark: string;
  swatch: string; // color shown in the settings picker
}

export const ACCENT_COLORS: Record<AccentColor, AccentPair> = {
  green: { light: "#16a34a", dark: "#4ade80", swatch: "#22c55e" },
  blue: { light: "#2563eb", dark: "#60a5fa", swatch: "#3b82f6" },
  purple: { light: "#7c3aed", dark: "#a78bfa", swatch: "#8b5cf6" },
  orange: { light: "#c2410c", dark: "#fb923c", swatch: "#f97316" },
  rose: { light: "#e11d48", dark: "#fb7185", swatch: "#f43f5e" },
  teal: { light: "#0d9488", dark: "#2dd4bf", swatch: "#14b8a6" },
};

export const ACCENT_NAMES: AccentColor[] = ["green", "blue", "purple", "orange", "rose", "teal"];

export function applyAccent(accent: AccentColor, resolvedTheme: "light" | "dark") {
  const pair = ACCENT_COLORS[accent];
  document.documentElement.style.setProperty("--color-accent", resolvedTheme === "dark" ? pair.dark : pair.light);
}
