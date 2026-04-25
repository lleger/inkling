import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useNotes } from "./useNotes";
import { makeQueryWrapper } from "./test-utils";
import { queryKeys } from "../lib/queries";
import * as api from "../lib/api";
import type { NoteMeta, Note } from "../types";

vi.mock("../lib/api");

const sampleNotes: NoteMeta[] = [
  { id: "1", title: "First", preview: "", word_count: 0, task_done: 0, task_total: 0, tags: "[]", pinned: 0, folder: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "2", title: "Second", preview: "", word_count: 0, task_done: 0, task_total: 0, tags: "[]", pinned: 1, folder: "Work", created_at: "2026-01-02T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" },
];

const newNote: Note = {
  id: "3", user_id: "u", title: "New", content: "", preview: "", word_count: 0,
  task_done: 0, task_total: 0, tags: "[]", pinned: 0, folder: null, deleted_at: null,
  created_at: "2026-01-03T00:00:00Z", updated_at: "2026-01-03T00:00:00Z",
};

beforeEach(() => {
  vi.mocked(api.fetchNotes).mockResolvedValue(sampleNotes);
  vi.mocked(api.createNote).mockResolvedValue(newNote);
  vi.mocked(api.deleteNote).mockResolvedValue(undefined);
  vi.mocked(api.restoreNote).mockResolvedValue(undefined);
  vi.mocked(api.pinNote).mockResolvedValue(undefined);
  vi.mocked(api.moveNoteToFolder).mockResolvedValue(undefined);
});

describe("useNotes", () => {
  it("fetches and returns notes", async () => {
    const { Wrapper } = makeQueryWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notes).toEqual(sampleNotes);
  });

  it("returns empty array while loading", () => {
    const { Wrapper } = makeQueryWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });
    expect(result.current.notes).toEqual([]);
  });

  it("create() invalidates notes and trash queries", async () => {
    const { qc, Wrapper } = makeQueryWrapper();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.create({ title: "New" });
    });

    expect(api.createNote).toHaveBeenCalledWith({ title: "New" });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.notes });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.trash });
  });

  it("remove() calls deleteNote and invalidates both queries", async () => {
    const { qc, Wrapper } = makeQueryWrapper();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.remove("1");
    });

    expect(api.deleteNote).toHaveBeenCalledWith("1");
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.notes });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.trash });
  });

  it("restore() calls restoreNote and invalidates both queries", async () => {
    const { qc, Wrapper } = makeQueryWrapper();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.restore("1");
    });

    expect(api.restoreNote).toHaveBeenCalledWith("1");
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.notes });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.trash });
  });

  it("pin() forwards id and pinned bool", async () => {
    const { Wrapper } = makeQueryWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.pin("1", true);
    });
    expect(api.pinNote).toHaveBeenCalledWith("1", true);

    await act(async () => {
      await result.current.pin("1", false);
    });
    expect(api.pinNote).toHaveBeenCalledWith("1", false);
  });

  it("move() forwards id and folder", async () => {
    const { Wrapper } = makeQueryWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.move("1", "Work");
    });
    expect(api.moveNoteToFolder).toHaveBeenCalledWith("1", "Work");

    await act(async () => {
      await result.current.move("1", null);
    });
    expect(api.moveNoteToFolder).toHaveBeenCalledWith("1", null);
  });

  it("refresh() invalidates only the notes query", async () => {
    const { qc, Wrapper } = makeQueryWrapper();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.refresh();
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.notes });
    expect(spy).not.toHaveBeenCalledWith({ queryKey: queryKeys.trash });
  });
});
