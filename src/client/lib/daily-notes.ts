import type { NoteMeta, Settings } from "../types";

export const DEFAULT_DAILY_NOTE_TEMPLATE = "# {{date}}\n\n## Notes\n\n## Tasks\n";

export function dailyTitle(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDailyTitle(title: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(title);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isAfterDay(date: Date, base: Date = new Date()): boolean {
  return dailyTitle(date) > dailyTitle(base);
}

export function dailyFolder(settings: Partial<Pick<Settings, "dailyNoteFolder">>): string {
  return settings.dailyNoteFolder || "Daily";
}

export function isDailyNote(note: NoteMeta, folder: string): boolean {
  return note.folder === folder && parseDailyTitle(note.title) !== null;
}

export function findDailyNote(notes: NoteMeta[], date: Date, folder: string): NoteMeta | undefined {
  const title = dailyTitle(date);
  return notes.find((note) => note.title === title && note.folder === folder);
}

export function dailyLabel(date: Date, base: Date = new Date()): string {
  const diff = dayDiff(date, base);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";

  const opts: Intl.DateTimeFormatOptions =
    date.getFullYear() === base.getFullYear()
      ? { weekday: "short", month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" };
  return new Intl.DateTimeFormat(undefined, opts).format(date);
}

export function renderDailyNoteTemplate(template: string | undefined, date: Date): string {
  const source = template?.trimEnd() || DEFAULT_DAILY_NOTE_TEMPLATE.trimEnd();
  const title = dailyTitle(date);
  const label = dailyLabel(date);
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);

  return `${source
    .replaceAll("{{date}}", title)
    .replaceAll("{{label}}", label)
    .replaceAll("{{weekday}}", weekday)}\n`;
}

function dayDiff(date: Date, base: Date): number {
  const a = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  return Math.round((a - b) / 86_400_000);
}
