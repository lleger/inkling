import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScratchNote } from "./useScratchNote";
import { makeQueryWrapper } from "./test-utils";
import { queryKeys } from "../lib/queries";
import * as api from "../lib/api";
import type { Note, NoteMeta } from "../types";

vi.mock("../lib/api");

const navigateMock = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

const scratchMeta: NoteMeta = {
  id: "scratch-1",
  title: "Scratch",
  preview: "",
  word_count: 0,
  task_done: 0,
  task_total: 0,
  tags: "[]",
  pinned: 0,
  folder: "Scratch",
  created_at: "2026-05-09T10:00:00Z",
  updated_at: new Date().toISOString(),
};

const scratchNote: Note = {
  ...scratchMeta,
  user_id: "u",
  content: "# Scratch\n\nold text",
  deleted_at: null,
};

const newScratchNote: Note = {
  ...scratchNote,
  id: "new-scratch",
  content: "# Scratch\n\n",
  folder: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  navigateMock.mockReset();
  vi.mocked(api.fetchSettings).mockResolvedValue({
    theme: "system",
    accent: "green",
    defaultMode: "richtext",
    smartTypography: true,
    dailyNoteFolder: "Daily",
    dailyNoteTemplate: "# {{date}}\n",
  });
  vi.mocked(api.createNote).mockResolvedValue(newScratchNote);
  vi.mocked(api.moveNoteToFolder).mockImplementation((_id, folder) =>
    Promise.resolve({ ...newScratchNote, folder }),
  );
  vi.mocked(api.fetchNote).mockResolvedValue(scratchNote);
  vi.mocked(api.updateNote).mockResolvedValue({ ...scratchNote, content: "# Scratch\n\n" });
});

describe("useScratchNote", () => {
  it("navigates to the existing scratch note", async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([scratchMeta]);
    const { qc, Wrapper } = makeQueryWrapper();
    qc.setQueryData(queryKeys.notes, [scratchMeta]);

    const { result } = renderHook(() => useScratchNote(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.openScratchNote();
    });

    expect(api.createNote).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/notes/$id",
      params: { id: "scratch-1" },
    });
  });

  it("creates one when none exists", async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([]);
    const { qc, Wrapper } = makeQueryWrapper();
    qc.setQueryData(queryKeys.notes, []);

    const { result } = renderHook(() => useScratchNote(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.openScratchNote();
    });

    expect(api.createNote).toHaveBeenCalledWith({ title: "Scratch", content: "# Scratch\n\n" });
    expect(api.moveNoteToFolder).toHaveBeenCalledWith("new-scratch", "Scratch");
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/notes/$id",
      params: { id: "new-scratch" },
    });
  });

  it("resets stale scratch content before navigating", async () => {
    const stale = { ...scratchMeta, updated_at: "2026-05-09T10:00:00Z" };
    vi.mocked(api.fetchNotes).mockResolvedValue([stale]);
    const { qc, Wrapper } = makeQueryWrapper();
    qc.setQueryData(queryKeys.notes, [stale]);

    const { result } = renderHook(() => useScratchNote(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.openScratchNote();
    });

    expect(api.fetchNote).toHaveBeenCalledWith("scratch-1");
    expect(api.updateNote).toHaveBeenCalledWith("scratch-1", { content: "# Scratch\n\n" });
  });

  it("does not reset stale scratch content when it is already blank", async () => {
    const stale = { ...scratchMeta, updated_at: "2026-05-09T10:00:00Z" };
    vi.mocked(api.fetchNotes).mockResolvedValue([stale]);
    vi.mocked(api.fetchNote).mockResolvedValue({ ...scratchNote, content: "# Scratch\n\n" });
    const { qc, Wrapper } = makeQueryWrapper();
    qc.setQueryData(queryKeys.notes, [stale]);

    const { result } = renderHook(() => useScratchNote(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.openScratchNote();
    });

    expect(api.updateNote).not.toHaveBeenCalled();
  });
});
