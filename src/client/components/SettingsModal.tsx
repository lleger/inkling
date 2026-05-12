import { X, Monitor, Sun, Moon, Check, LogOut } from "lucide-react";
import { signOut } from "../lib/auth-client";
import type { Settings } from "../hooks/useSettings";
import { ACCENT_COLORS, ACCENT_NAMES } from "../lib/accent-colors";
import type { EditorMode } from "../types";
import { Dialog, DialogClose } from "./ui/Dialog";
import { IconButton } from "./ui/IconButton";
import { Input } from "./ui/Input";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Switch } from "./ui/Switch";
import { Textarea } from "./ui/Textarea";

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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title="Settings"
      placement="center"
      size="xs"
      className="sm:rounded-lg sm:shadow-xl"
      contentClassName="max-h-[calc(100dvh-1rem)] overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-xs font-semibold text-text">Settings</span>
        <DialogClose render={<IconButton buttonSize="xs" aria-label="Close" />}>
          <X size={12} />
        </DialogClose>
      </div>

      <div className="max-h-[calc(100dvh-4.5rem)] space-y-5 overflow-y-auto p-4">
        {/* Theme */}
        <div>
          <label className="block text-[12px] font-medium text-text-secondary mb-2">Theme</label>
          <SegmentedControl
            value={settings.theme}
            options={themeOptions}
            onValueChange={(theme) => onUpdateSettings({ theme })}
          />
        </div>

        {/* Accent color */}
        <div>
          <label className="block text-[12px] font-medium text-text-secondary mb-2">
            Accent color
          </label>
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
          <label className="block text-[12px] font-medium text-text-secondary mb-2">
            Default editor
          </label>
          <SegmentedControl
            value={settings.defaultMode}
            options={modeOptions}
            onValueChange={(defaultMode) => onUpdateSettings({ defaultMode })}
          />
        </div>

        {/* Daily note folder */}
        <div>
          <label className="block text-[12px] font-medium text-text-secondary mb-2">
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

        {/* Daily note template */}
        <div>
          <label className="block text-[12px] font-medium text-text-secondary mb-2">
            Daily note template
          </label>
          <Textarea
            value={settings.dailyNoteTemplate}
            onChange={(e) => onUpdateSettings({ dailyNoteTemplate: e.target.value })}
            rows={6}
            className="font-mono"
          />
          <span className="mt-1 block text-[11px] text-text-muted">
            Supports {"{{date}}"}, {"{{label}}"}, and {"{{weekday}}"}
          </span>
        </div>

        {/* Smart typography */}
        <div className="flex items-center justify-between">
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

        {/* Account */}
        {userEmail && (
          <div className="border-t border-border pt-4">
            <label className="block text-[12px] font-medium text-text-secondary mb-1">
              Account
            </label>
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-[12px] text-text-muted">{userEmail}</span>
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
    </Dialog>
  );
}
