import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../lib/api";
import { notesQuery, queryKeys } from "../lib/queries";
import type { Note } from "../types";

export function useNotes() {
  const qc = useQueryClient();
  const query = useQuery(notesQuery());

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.notes });
    qc.invalidateQueries({ queryKey: queryKeys.trash });
  };

  const createMutation = useMutation({
    mutationFn: (options?: { title?: string; content?: string }) => api.createNote(options),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.restoreNote(id),
    onSuccess: invalidate,
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => api.pinNote(id, pinned),
    onSuccess: invalidate,
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, folder }: { id: string; folder: string | null }) => api.moveNoteToFolder(id, folder),
    onSuccess: invalidate,
  });

  return {
    notes: query.data ?? [],
    loading: query.isLoading,
    refresh: () => qc.invalidateQueries({ queryKey: queryKeys.notes }),
    create: async (options?: { title?: string; content?: string }): Promise<Note> => createMutation.mutateAsync(options),
    remove: async (id: string) => removeMutation.mutateAsync(id),
    restore: async (id: string) => restoreMutation.mutateAsync(id),
    pin: async (id: string, pinned: boolean) => pinMutation.mutateAsync({ id, pinned }),
    move: async (id: string, folder: string | null) => moveMutation.mutateAsync({ id, folder }),
  };
}
