import { describe, expect, it } from "vitest";
import {
  addDays,
  dailyLabel,
  dailyTitle,
  findDailyNote,
  isAfterDay,
  parseDailyTitle,
  renderDailyNoteTemplate,
} from "./daily-notes";
import type { NoteMeta } from "../types";

describe("dailyTitle", () => {
  it("formats dates as YYYY-MM-DD", () => {
    expect(dailyTitle(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(dailyTitle(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("parseDailyTitle", () => {
  it("parses valid daily note titles", () => {
    expect(parseDailyTitle("2026-05-10")?.toDateString()).toBe(
      new Date(2026, 4, 10).toDateString(),
    );
  });

  it("rejects invalid or non-daily titles", () => {
    expect(parseDailyTitle("2026-02-31")).toBeNull();
    expect(parseDailyTitle("Today")).toBeNull();
    expect(parseDailyTitle("2026-5-10")).toBeNull();
  });
});

describe("dailyLabel", () => {
  const base = new Date(2026, 4, 10);

  it("renders nearby dates relatively", () => {
    expect(dailyLabel(base, base)).toBe("Today");
    expect(dailyLabel(addDays(base, -1), base)).toBe("Yesterday");
    expect(dailyLabel(addDays(base, 1), base)).toBe("Tomorrow");
  });
});

describe("isAfterDay", () => {
  it("detects dates after the base calendar day", () => {
    const base = new Date(2026, 4, 10, 23, 59);

    expect(isAfterDay(new Date(2026, 4, 11), base)).toBe(true);
    expect(isAfterDay(new Date(2026, 4, 10, 0, 1), base)).toBe(false);
    expect(isAfterDay(new Date(2026, 4, 9), base)).toBe(false);
  });
});

describe("findDailyNote", () => {
  it("matches exact date title in configured folder", () => {
    const notes: NoteMeta[] = [
      note("wrong-folder", "2026-05-10", "Other"),
      note("daily", "2026-05-10", "Daily"),
    ];

    expect(findDailyNote(notes, new Date(2026, 4, 10), "Daily")?.id).toBe("daily");
  });
});

describe("renderDailyNoteTemplate", () => {
  it("renders supported placeholders", () => {
    const today = new Date();
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(today);

    expect(renderDailyNoteTemplate("# {{label}}\n{{date}} {{weekday}}", today)).toBe(
      `# Today\n${dailyTitle(today)} ${weekday}\n`,
    );
  });
});

function note(id: string, title: string, folder: string | null): NoteMeta {
  return {
    id,
    title,
    preview: "",
    word_count: 0,
    task_done: 0,
    task_total: 0,
    tags: "[]",
    pinned: 0,
    folder,
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
  };
}
