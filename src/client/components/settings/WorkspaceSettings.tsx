import { Check, Monitor, Moon, Sun } from "lucide-react";
import { ACCENT_COLORS, ACCENT_NAMES } from "../../lib/accent-colors";
import type { EditorMode, Settings } from "../../types";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Switch } from "../ui/Switch";

interface WorkspaceSettingsProps {
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
}

export function WorkspaceSettings({ settings, onUpdateSettings }: WorkspaceSettingsProps) {
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
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface-secondary/70 p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-text">Appearance</h2>
          <p className="mt-1 text-[12px] text-text-muted">Tune the editor to fit your workspace.</p>
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-2 block text-[12px] font-medium text-text-secondary">Theme</div>
            <SegmentedControl
              value={settings.theme}
              options={themeOptions}
              onValueChange={(theme) => onUpdateSettings({ theme })}
              aria-label="Theme"
            />
          </div>

          <div>
            <div className="mb-2 block text-[12px] font-medium text-text-secondary">
              Accent color
            </div>
            <div className="flex flex-wrap gap-2">
              {ACCENT_NAMES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onUpdateSettings({ accent: color })}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                  aria-label={`Use ${color} accent color`}
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
            <div className="mb-2 block text-[12px] font-medium text-text-secondary">
              Default editor
            </div>
            <SegmentedControl
              value={settings.defaultMode}
              options={modeOptions}
              onValueChange={(defaultMode) => onUpdateSettings({ defaultMode })}
              aria-label="Default editor"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface/60 p-3">
            <div>
              <div className="block text-[12px] font-medium text-text-secondary">
                Copy Markdown by default
              </div>
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
              <div className="block text-[12px] font-medium text-text-secondary">
                Smart typography
              </div>
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
    </div>
  );
}
