import type { Settings } from "../../types";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

interface DailySettingsProps {
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
}

export function DailySettings({ settings, onUpdateSettings }: DailySettingsProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface-secondary/70 p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-text">Daily Notes</h2>
        <p className="mt-1 text-[12px] text-text-muted">
          Configure where daily notes live and what they start with.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label
            htmlFor="daily-note-folder"
            className="mb-2 block text-[12px] font-medium text-text-secondary"
          >
            Daily note folder
          </label>
          <Input
            id="daily-note-folder"
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
          <label
            htmlFor="daily-note-template"
            className="mb-2 block text-[12px] font-medium text-text-secondary"
          >
            Daily note template
          </label>
          <Textarea
            id="daily-note-template"
            value={settings.dailyNoteTemplate}
            onChange={(e) => onUpdateSettings({ dailyNoteTemplate: e.target.value })}
            rows={8}
            className="font-mono"
          />
          <span className="mt-1 block text-[11px] text-text-muted">
            Supports {"{{date}}"} (e.g., 2026-05-20), {"{{label}}"} (e.g., Today or Mon, May 20),
            and {"{{weekday}}"} (e.g., Wednesday).
          </span>
        </div>
      </div>
    </section>
  );
}
