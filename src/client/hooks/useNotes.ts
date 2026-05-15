import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../lib/api";
import { notesQuery, queryKeys } from "../lib/queries";
import {
  addCachedTrashEntry,
  invalidateNoteLists,
  invalidateNotes,
  patchCachedNote,
  removeCachedNoteMeta,
  removeCachedTrashEntry,
  upsertCachedNoteMeta,
  writeCachedNote,
} from "../lib/note-cache";
import type { DeletedNoteMeta, Note, NoteMeta } from "../types";

export function useNotes() {
  const qc = useQueryClient();
  const query = useQuery(notesQuery());

  /** Snapshot both caches for rollback on error. */
  const snapshot = (id?: string) => ({
    notes: qc.getQueryData<NoteMeta[]>(queryKeys.notes),
    trash: qc.getQueryData<DeletedNoteMeta[]>(queryKeys.trash),
    note: id ? qc.getQueryData<Note>(queryKeys.note(id)) : undefined,
    noteId: id,
  });

  const restoreSnapshot = (snap: {
    notes?: NoteMeta[];
    trash?: DeletedNoteMeta[];
    note?: Note;
    noteId?: string;
  }) => {
    if (snap.notes !== undefined) qc.setQueryData(queryKeys.notes, snap.notes);
    if (snap.trash !== undefined) qc.setQueryData(queryKeys.trash, snap.trash);
    if (snap.noteId && snap.note !== undefined)
      qc.setQueryData(queryKeys.note(snap.noteId), snap.note);
  };

  const invalidateAll = () => invalidateNoteLists(qc);

  // CREATE — leaves cache alone optimistically (we don't have the new ID yet).
  // Invalidate on success so the new note appears.
  const createMutation = useMutation({
    mutationFn: (options?: { title?: string; content?: string }) => api.createNote(options),
    onSuccess: (note) => {
      writeCachedNote(qc, note);
      // Server will re-sort by pinned/updated_at; refetch in the background.
      invalidateNotes(qc);
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
      removeCachedNoteMeta(qc, id);
      if (removed) addCachedTrashEntry(qc, removed);
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
      removeCachedTrashEntry(qc, id);
      return snap;
    },
    onError: (_e, _v, context) => context && restoreSnapshot(context),
    onSettled: invalidateAll,
  });

  // PIN — toggle pinned in-place. The list might re-sort; invalidate after.
  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => api.pinNote(id, pinned),
    onMutate: async ({ id, pinned }) => {
      const snap = snapshot(id);
      await qc.cancelQueries({ queryKey: queryKeys.notes });
      await qc.cancelQueries({ queryKey: queryKeys.note(id) });
      patchCachedNote(qc, id, { pinned: pinned ? 1 : 0 });
      return snap;
    },
    onError: (_e, _v, context) => context && restoreSnapshot(context),
    onSuccess: (note) => {
      upsertCachedNoteMeta(qc, note);
      patchCachedNote(qc, note.id, note);
    },
    onSettled: () => invalidateNotes(qc),
  });

  // MOVE — swap folder field in-place.
  const moveMutation = useMutation({
    mutationFn: ({ id, folder }: { id: string; folder: string | null }) =>
      api.moveNoteToFolder(id, folder),
    onMutate: async ({ id, folder }) => {
      const snap = snapshot(id);
      await qc.cancelQueries({ queryKey: queryKeys.notes });
      await qc.cancelQueries({ queryKey: queryKeys.note(id) });
      patchCachedNote(qc, id, { folder });
      return snap;
    },
    onError: (_e, _v, context) => context && restoreSnapshot(context),
    onSuccess: (note) => {
      upsertCachedNoteMeta(qc, note);
      patchCachedNote(qc, note.id, note);
    },
    onSettled: () => invalidateNotes(qc),
  });

  return {
    notes: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: async (options?: { title?: string; content?: string }): Promise<Note> =>
      createMutation.mutateAsync(options),
    remove: async (id: string) => removeMutation.mutateAsync(id),
    restore: async (id: string) => restoreMutation.mutateAsync(id),
    pin: async (id: string, pinned: boolean) => {
      await pinMutation.mutateAsync({ id, pinned });
    },
    move: async (id: string, folder: string | null) => {
      await moveMutation.mutateAsync({ id, folder });
    },
  };
}
