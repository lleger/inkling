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

  it("create() inserts the new note into the cache and invalidates notes", async () => {
    const newMeta: NoteMeta = {
      id: "3", title: "New", preview: "", word_count: 0, task_done: 0, task_total: 0,
      tags: "[]", pinned: 0, folder: null,
      created_at: "2026-01-03T00:00:00Z", updated_at: "2026-01-03T00:00:00Z",
    };
    // The post-success refetch should see the new note from the server
    vi.mocked(api.fetchNotes).mockResolvedValue([newMeta, ...sampleNotes]);

    const { qc, Wrapper } = makeQueryWrapper();
    qc.setQueryData(queryKeys.notes, sampleNotes);
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.create({ title: "New" });
    });

    expect(api.createNote).toHaveBeenCalledWith({ title: "New" });
    const cached = qc.getQueryData<NoteMeta[]>(queryKeys.notes);
    expect(cached?.find((n) => n.id === "3")).toBeTruthy();
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.notes });
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

  describe("optimistic updates", () => {
    it("remove() drops the note from the cache before the server responds", async () => {
      // Make the API hang so we can inspect the cache mid-mutation
      let resolve!: () => void;
      vi.mocked(api.deleteNote).mockImplementation(
        () => new Promise<void>((r) => { resolve = r; }),
      );
      const { qc, Wrapper } = makeQueryWrapper();
      qc.setQueryData(queryKeys.notes, sampleNotes);
      qc.setQueryData(queryKeys.trash, []);
      const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

      // Fire the mutation but don't await yet
      let p!: Promise<void>;
      act(() => { p = result.current.remove("1"); });

      // Cache reflects the removal immediately
      await waitFor(() => {
        const cached = qc.getQueryData<NoteMeta[]>(queryKeys.notes);
        expect(cached?.find((n) => n.id === "1")).toBeUndefined();
      });
      // And the note appears in trash
      const trash = qc.getQueryData<any[]>(queryKeys.trash);
      expect(trash?.find((n) => n.id === "1")).toBeTruthy();

      resolve();
      await act(async () => { await p; });
    });

    it("remove() rolls back when the server fails", async () => {
      vi.mocked(api.deleteNote).mockRejectedValue(new Error("boom"));
      const { qc, Wrapper } = makeQueryWrapper();
      qc.setQueryData(queryKeys.notes, sampleNotes);
      const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.remove("1").catch(() => {});
      });

      const cached = qc.getQueryData<NoteMeta[]>(queryKeys.notes);
      expect(cached).toEqual(sampleNotes);
    });

    it("pin() flips the pinned field optimistically", async () => {
      let resolve!: () => void;
      vi.mocked(api.pinNote).mockImplementation(
        () => new Promise<void>((r) => { resolve = r; }),
      );
      const { qc, Wrapper } = makeQueryWrapper();
      qc.setQueryData(queryKeys.notes, sampleNotes);
      const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

      let p!: Promise<void>;
      act(() => { p = result.current.pin("1", true); });

      await waitFor(() => {
        const cached = qc.getQueryData<NoteMeta[]>(queryKeys.notes);
        expect(cached?.find((n) => n.id === "1")?.pinned).toBe(1);
      });

      resolve();
      await act(async () => { await p; });
    });

    it("move() updates folder optimistically", async () => {
      let resolve!: () => void;
      vi.mocked(api.moveNoteToFolder).mockImplementation(
        () => new Promise<void>((r) => { resolve = r; }),
      );
      const { qc, Wrapper } = makeQueryWrapper();
      qc.setQueryData(queryKeys.notes, sampleNotes);
      const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

      let p!: Promise<void>;
      act(() => { p = result.current.move("1", "Personal"); });

      await waitFor(() => {
        const cached = qc.getQueryData<NoteMeta[]>(queryKeys.notes);
        expect(cached?.find((n) => n.id === "1")?.folder).toBe("Personal");
      });

      resolve();
      await act(async () => { await p; });
    });

    it("restore() removes from trash optimistically", async () => {
      let resolve!: () => void;
      vi.mocked(api.restoreNote).mockImplementation(
        () => new Promise<void>((r) => { resolve = r; }),
      );
      const { qc, Wrapper } = makeQueryWrapper();
      qc.setQueryData(queryKeys.trash, [{
        id: "trashed-1", title: "Old", deleted_at: "2026-01-01T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
      }]);
      const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

      let p!: Promise<void>;
      act(() => { p = result.current.restore("trashed-1"); });

      await waitFor(() => {
        const trash = qc.getQueryData<any[]>(queryKeys.trash);
        expect(trash?.find((n) => n.id === "trashed-1")).toBeUndefined();
      });

      resolve();
      await act(async () => { await p; });
    });
  });
});
