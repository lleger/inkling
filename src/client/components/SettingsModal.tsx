import { useEffect } from "react";
import { X, Monitor, Sun, Moon, Check, LogOut } from "lucide-react";
import { signOut } from "../lib/auth-client";
import type { Settings, AccentColor } from "../hooks/useSettings";
import { ACCENT_COLORS, ACCENT_NAMES } from "../lib/accent-colors";
import type { EditorMode } from "../types";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
  userEmail: string | null;
}

export function SettingsModal({
  open,
  onClose,
  settings,
  onUpdateSettings,
  userEmail,
}: SettingsModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const themeOptions: { value: Settings["theme"]; label: string; icon: React.ReactNode }[] = [
    { value: "system", label: "System", icon: <Monitor size={14} /> },
    { value: "light", label: "Light", icon: <Sun size={14} /> },
    { value: "dark", label: "Dark", icon: <Moon size={14} /> },
  ];

  const modeOptions: { value: EditorMode; label: string }[] = [
    { value: "richtext", label: "Rich Text" },
    { value: "markdown", label: "Markdown" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay animate-[fade-in_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-lg border border-border bg-surface shadow-xl animate-[scale-in_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-xs font-semibold text-text">Settings</span>
          <button
            className="flex size-5 items-center justify-center rounded text-text-muted hover:bg-surface-hover hover:text-text-secondary"
            onClick={onClose}
          >
            <X size={12} />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Theme */}
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-2">Theme</label>
            <div className="flex gap-1 rounded-md bg-surface-secondary p-0.5 border border-border">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdateSettings({ theme: opt.value })}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 text-[12px] font-medium transition-all ${
                    settings.theme === opt.value
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accent color */}
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-2">Accent color</label>
            <div className="flex gap-2">
              {ACCENT_NAMES.map((color) => (
                <button
                  key={color}
                  onClick={() => onUpdateSettings({ accent: color })}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                  className="relative flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: ACCENT_COLORS[color].swatch }}
                >
                  {settings.accent === color && (
                    <Check size={13} className="text-white" strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Default editor mode */}
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-2">Default editor</label>
            <div className="flex gap-1 rounded-md bg-surface-secondary p-0.5 border border-border">
              {modeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdateSettings({ defaultMode: opt.value })}
                  className={`flex flex-1 items-center justify-center rounded py-1.5 text-[12px] font-medium transition-all ${
                    settings.defaultMode === opt.value
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Daily note folder */}
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-2">Daily note folder</label>
            <input
              type="text"
              value={settings.dailyNoteFolder}
              onChange={(e) => onUpdateSettings({ dailyNoteFolder: e.target.value })}
              placeholder="Daily"
              className="w-full rounded-md border border-border bg-surface-secondary px-2.5 py-1.5 text-[12px] text-text outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <span className="mt-1 block text-[11px] text-text-muted">Where Cmd+Shift+D notes are filed</span>
          </div>

          {/* Smart typography */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-[12px] font-medium text-text-secondary">Smart typography</label>
              <span className="text-[11px] text-text-muted">Curly quotes, em-dashes, ellipsis</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ smartTypography: !settings.smartTypography })}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                settings.smartTypography ? "bg-accent" : "bg-surface-tertiary"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
                  settings.smartTypography ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Account */}
          {userEmail && (
            <div className="border-t border-border pt-4">
              <label className="block text-[12px] font-medium text-text-secondary mb-1">Account</label>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-muted">{userEmail}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    window.location.href = "/login";
                  }}
                  className="flex items-center gap-1 text-[12px] text-text-muted hover:text-text-secondary"
                >
                  <LogOut size={12} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
