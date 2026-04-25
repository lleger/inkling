import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { todayTitle, useDailyNote } from "./useDailyNote";
import { makeQueryWrapper } from "./test-utils";
import { queryKeys } from "../lib/queries";
import * as api from "../lib/api";
import type { NoteMeta, Note } from "../types";

vi.mock("../lib/api");

const navigateMock = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

const today = todayTitle();

const existingDailyNote: NoteMeta = {
  id: "daily-1", title: today, preview: "", word_count: 0, task_done: 0, task_total: 0,
  tags: "[]", pinned: 0, folder: "Daily",
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};

const otherNote: NoteMeta = {
  id: "other", title: "Other", preview: "", word_count: 0, task_done: 0, task_total: 0,
  tags: "[]", pinned: 0, folder: null,
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};

const newDailyNote: Note = {
  id: "new-daily", user_id: "u", title: today, content: "", preview: "", word_count: 0,
  task_done: 0, task_total: 0, tags: "[]", pinned: 0, folder: null, deleted_at: null,
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  navigateMock.mockReset();
  vi.mocked(api.fetchSettings).mockResolvedValue({
    theme: "system",
    accent: "green",
    defaultMode: "richtext",
    smartTypography: true,
    dailyNoteFolder: "Daily",
  });
  vi.mocked(api.createNote).mockResolvedValue(newDailyNote);
  vi.mocked(api.moveNoteToFolder).mockResolvedValue(undefined);
});

describe("todayTitle", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(todayTitle(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(todayTitle(new Date(2026, 11, 31))).toBe("2026-12-31");
    expect(todayTitle(new Date(2026, 3, 24))).toBe("2026-04-24");
  });

  it("zero-pads single-digit months and days", () => {
    expect(todayTitle(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(todayTitle(new Date(2026, 8, 9))).toBe("2026-09-09");
  });
});

describe("useDailyNote", () => {
  it("navigates to existing daily note when one exists", async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([otherNote, existingDailyNote]);
    const { qc, Wrapper } = makeQueryWrapper();
    qc.setQueryData(queryKeys.notes, [otherNote, existingDailyNote]);

    const { result } = renderHook(() => useDailyNote(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.openDailyNote();
    });

    expect(api.createNote).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/notes/$id",
      params: { id: "daily-1" },
    });
  });

  it("creates a new daily note when none exists", async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([otherNote]);
    const { qc, Wrapper } = makeQueryWrapper();
    qc.setQueryData(queryKeys.notes, [otherNote]);

    const { result } = renderHook(() => useDailyNote(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.openDailyNote();
    });

    expect(api.createNote).toHaveBeenCalledWith({
      title: today,
      content: `# ${today}\n\n`,
    });
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/notes/$id",
      params: { id: "new-daily" },
    });
  });

  it("moves the new note to the configured folder", async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([]);
    const { qc, Wrapper } = makeQueryWrapper();
    qc.setQueryData(queryKeys.notes, []);
    qc.setQueryData(queryKeys.settings, {
      theme: "system" as const,
      accent: "green" as const,
      defaultMode: "richtext" as const,
      smartTypography: true,
      dailyNoteFolder: "Journal",
    });

    const { result } = renderHook(() => useDailyNote(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.openDailyNote();
    });

    expect(api.moveNoteToFolder).toHaveBeenCalledWith("new-daily", "Journal");
  });

  it("does NOT match a note with same title in a different folder", async () => {
    const wrongFolder: NoteMeta = { ...existingDailyNote, id: "wrong", folder: "Other" };
    vi.mocked(api.fetchNotes).mockResolvedValue([wrongFolder]);
    const { qc, Wrapper } = makeQueryWrapper();
    qc.setQueryData(queryKeys.notes, [wrongFolder]);

    const { result } = renderHook(() => useDailyNote(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.openDailyNote();
    });

    expect(api.createNote).toHaveBeenCalled();
  });
});
