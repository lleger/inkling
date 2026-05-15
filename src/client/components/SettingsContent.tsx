import { Check, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { signOut } from "../lib/auth-client";
import { ACCENT_COLORS, ACCENT_NAMES } from "../lib/accent-colors";
import type { EditorMode, Settings } from "../types";
import { Input } from "./ui/Input";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Switch } from "./ui/Switch";
import { Textarea } from "./ui/Textarea";

interface SettingsContentProps {
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
  userEmail: string | null;
}

export function SettingsContent({ settings, onUpdateSettings, userEmail }: SettingsContentProps) {
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
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface-secondary/70 p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-text">Appearance</h2>
          <p className="mt-1 text-[12px] text-text-muted">Tune the editor to fit your workspace.</p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-[12px] font-medium text-text-secondary">Theme</label>
            <SegmentedControl
              value={settings.theme}
              options={themeOptions}
              onValueChange={(theme) => onUpdateSettings({ theme })}
              aria-label="Theme"
            />
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-medium text-text-secondary">
              Accent color
            </label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_NAMES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onUpdateSettings({ accent: color })}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                  className="relative flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: ACCENT_COLORS[color].swatch }}
                >
                  {settings.accent === color && (
                    <Check size={14} className="text-white" strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-secondary/70 p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-text">Editor</h2>
          <p className="mt-1 text-[12px] text-text-muted">
            Choose how notes open, copy, and format while you write.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-[12px] font-medium text-text-secondary">
              Default editor
            </label>
            <SegmentedControl
              value={settings.defaultMode}
              options={modeOptions}
              onValueChange={(defaultMode) => onUpdateSettings({ defaultMode })}
              aria-label="Default editor"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface/60 p-3">
            <div>
              <label className="block text-[12px] font-medium text-text-secondary">
                Copy Markdown by default
              </label>
              <span className="text-[11px] text-text-muted">
                When off, Cmd+C copies rich text. Cmd+Ctrl+Shift+C always copies Markdown.
              </span>
            </div>
            <Switch
              checked={settings.copyMarkdownByDefault}
              onCheckedChange={(copyMarkdownByDefault) =>
                onUpdateSettings({ copyMarkdownByDefault })
              }
              aria-label="Copy Markdown by default"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface/60 p-3">
            <div>
              <label className="block text-[12px] font-medium text-text-secondary">
                Smart typography
              </label>
              <span className="text-[11px] text-text-muted">Curly quotes, em-dashes, ellipsis</span>
            </div>
            <Switch
              checked={settings.smartTypography}
              onCheckedChange={(smartTypography) => onUpdateSettings({ smartTypography })}
              aria-label="Smart typography"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-secondary/70 p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-text">Daily Notes</h2>
          <p className="mt-1 text-[12px] text-text-muted">
            Configure where daily notes live and what they start with.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-[12px] font-medium text-text-secondary">
              Daily note folder
            </label>
            <Input
              type="text"
              value={settings.dailyNoteFolder}
              onChange={(e) => onUpdateSettings({ dailyNoteFolder: e.target.value })}
              placeholder="Daily"
            />
            <span className="mt-1 block text-[11px] text-text-muted">
              Where Cmd+Shift+D notes are filed
            </span>
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-medium text-text-secondary">
              Daily note template
            </label>
            <Textarea
              value={settings.dailyNoteTemplate}
              onChange={(e) => onUpdateSettings({ dailyNoteTemplate: e.target.value })}
              rows={8}
              className="font-mono"
            />
            <span className="mt-1 block text-[11px] text-text-muted">
              Supports {"{{date}}"}, {"{{label}}"}, and {"{{weekday}}"}
            </span>
          </div>
        </div>
      </section>

      {userEmail && (
        <section className="rounded-2xl border border-border bg-surface-secondary/70 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-text">Account</h2>
            <p className="mt-1 truncate text-[12px] text-text-muted">Signed in as {userEmail}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
          >
            <LogOut size={13} /> Sign out
          </button>
        </section>
      )}
    </div>
  );
}
