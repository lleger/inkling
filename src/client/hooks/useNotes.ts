import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../lib/api";
import { notesQuery, queryKeys } from "../lib/queries";
import type { DeletedNoteMeta, Note, NoteMeta } from "../types";

/** Build a NoteMeta from a Note (matches the shape the list endpoint returns). */
function metaFromNote(n: Note): NoteMeta {
  return {
    id: n.id,
    title: n.title,
    preview: n.preview,
    word_count: n.word_count,
    task_done: n.task_done,
    task_total: n.task_total,
    tags: n.tags,
    pinned: n.pinned,
    folder: n.folder,
    created_at: n.created_at,
    updated_at: n.updated_at,
  };
}

export function useNotes() {
  const qc = useQueryClient();
  const query = useQuery(notesQuery());

  /** Snapshot both caches for rollback on error. */
  const snapshot = () => ({
    notes: qc.getQueryData<NoteMeta[]>(queryKeys.notes),
    trash: qc.getQueryData<DeletedNoteMeta[]>(queryKeys.trash),
  });

  const restoreSnapshot = (snap: { notes?: NoteMeta[]; trash?: DeletedNoteMeta[] }) => {
    if (snap.notes !== undefined) qc.setQueryData(queryKeys.notes, snap.notes);
    if (snap.trash !== undefined) qc.setQueryData(queryKeys.trash, snap.trash);
  };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: queryKeys.notes });
    qc.invalidateQueries({ queryKey: queryKeys.trash });
  };

  // CREATE — leaves cache alone optimistically (we don't have the new ID yet).
  // Invalidate on success so the new note appears.
  const createMutation = useMutation({
    mutationFn: (options?: { title?: string; content?: string }) => api.createNote(options),
    onSuccess: (note) => {
      qc.setQueryData<NoteMeta[]>(queryKeys.notes, (prev) =>
        prev ? [metaFromNote(note), ...prev] : [metaFromNote(note)],
      );
      // Server will re-sort by pinned/updated_at; refetch in the background.
      qc.invalidateQueries({ queryKey: queryKeys.notes });
    },
  });

  // DELETE (soft) — remove from notes list, add to trash.
  const removeMutation = useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onMutate: async (id) => {
      // Snapshot first so we capture the data even if a refetch is mid-flight.
      const snap = snapshot();
      const removed = snap.notes?.find((n) => n.id === id);
      await qc.cancelQueries({ queryKey: queryKeys.notes });
      await qc.cancelQueries({ queryKey: queryKeys.trash });
      qc.setQueryData<NoteMeta[]>(queryKeys.notes, (prev) =>
        prev ? prev.filter((n) => n.id !== id) : prev,
      );
      if (removed) {
        qc.setQueryData<DeletedNoteMeta[]>(queryKeys.trash, (prev) => {
          const entry: DeletedNoteMeta = {
            id: removed.id,
            title: removed.title,
            deleted_at: new Date().toISOString(),
            created_at: removed.created_at,
          };
          return prev ? [entry, ...prev] : [entry];
        });
      }
      return snap;
    },
    onError: (_e, _v, context) => context && restoreSnapshot(context),
    onSettled: invalidateAll,
  });

  // RESTORE — remove from trash, add back to notes (we don't have full metadata
  // optimistically, so just remove from trash and let invalidate fill in).
  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.restoreNote(id),
    onMutate: async (id) => {
      const snap = snapshot();
      await qc.cancelQueries({ queryKey: queryKeys.trash });
      qc.setQueryData<DeletedNoteMeta[]>(queryKeys.trash, (prev) =>
        prev ? prev.filter((n) => n.id !== id) : prev,
      );
      return snap;
    },
    onError: (_e, _v, context) => context && restoreSnapshot(context),
    onSettled: invalidateAll,
  });

  // PIN — toggle pinned in-place. The list might re-sort; invalidate after.
  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => api.pinNote(id, pinned),
    onMutate: async ({ id, pinned }) => {
      const snap = snapshot();
      await qc.cancelQueries({ queryKey: queryKeys.notes });
      qc.setQueryData<NoteMeta[]>(queryKeys.notes, (prev) =>
        prev?.map((n) => (n.id === id ? { ...n, pinned: pinned ? 1 : 0 } : n)),
      );
      return snap;
    },
    onError: (_e, _v, context) => context && restoreSnapshot(context),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.notes }),
  });

  // MOVE — swap folder field in-place.
  const moveMutation = useMutation({
    mutationFn: ({ id, folder }: { id: string; folder: string | null }) =>
      api.moveNoteToFolder(id, folder),
    onMutate: async ({ id, folder }) => {
      const snap = snapshot();
      await qc.cancelQueries({ queryKey: queryKeys.notes });
      qc.setQueryData<NoteMeta[]>(queryKeys.notes, (prev) =>
        prev?.map((n) => (n.id === id ? { ...n, folder } : n)),
      );
      return snap;
    },
    onError: (_e, _v, context) => context && restoreSnapshot(context),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.notes }),
  });

  return {
    notes: query.data ?? [],
    loading: query.isLoading,
    refresh: () => qc.invalidateQueries({ queryKey: queryKeys.notes }),
    create: async (options?: { title?: string; content?: string }): Promise<Note> =>
      createMutation.mutateAsync(options),
    remove: async (id: string) => removeMutation.mutateAsync(id),
    restore: async (id: string) => restoreMutation.mutateAsync(id),
    pin: async (id: string, pinned: boolean) => pinMutation.mutateAsync({ id, pinned }),
    move: async (id: string, folder: string | null) => moveMutation.mutateAsync({ id, folder }),
  };
}
