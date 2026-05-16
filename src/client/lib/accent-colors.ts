import type { AccentColor } from "../hooks/useSettings";

interface AccentPair {
  light: string;
  dark: string;
  swatch: string; // color shown in the settings picker
  foreground: string;
}

export const ACCENT_COLORS: Record<AccentColor, AccentPair> = {
  green: { light: "#16a34a", dark: "#4ade80", swatch: "#22c55e", foreground: "#ffffff" },
  blue: { light: "#2563eb", dark: "#60a5fa", swatch: "#3b82f6", foreground: "#ffffff" },
  purple: { light: "#7c3aed", dark: "#a78bfa", swatch: "#8b5cf6", foreground: "#ffffff" },
  orange: { light: "#c2410c", dark: "#fb923c", swatch: "#f97316", foreground: "#ffffff" },
  rose: { light: "#e11d48", dark: "#fb7185", swatch: "#f43f5e", foreground: "#ffffff" },
  teal: { light: "#0d9488", dark: "#2dd4bf", swatch: "#14b8a6", foreground: "#ffffff" },
  indigo: { light: "#4f46e5", dark: "#818cf8", swatch: "#6366f1", foreground: "#ffffff" },
  slate: { light: "#475569", dark: "#94a3b8", swatch: "#64748b", foreground: "#ffffff" },
  yellow: { light: "#a16207", dark: "#facc15", swatch: "#eab308", foreground: "#422006" },
};

export const ACCENT_NAMES: AccentColor[] = [
  "rose",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
  "slate",
];

export function applyAccent(accent: AccentColor, resolvedTheme: "light" | "dark") {
  const pair = ACCENT_COLORS[accent];
  document.documentElement.style.setProperty(
    "--color-accent",
    resolvedTheme === "dark" ? pair.dark : pair.light,
  );
  document.documentElement.style.setProperty("--color-accent-foreground", pair.foreground);
}
