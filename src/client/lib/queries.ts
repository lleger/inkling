import { queryOptions } from "@tanstack/react-query";
import * as api from "./api";

export const queryKeys = {
  notes: ["notes"] as const,
  note: (id: string) => ["notes", id] as const,
  trash: ["trash"] as const,
  versions: (noteId: string) => ["versions", noteId] as const,
  user: ["user"] as const,
  settings: ["settings"] as const,
};

export const notesQuery = () =>
  queryOptions({
    queryKey: queryKeys.notes,
    queryFn: () => api.fetchNotes(),
  });

export const noteQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.note(id),
    queryFn: () => api.fetchNote(id),
    enabled: !!id,
  });

export const trashQuery = () =>
  queryOptions({
    queryKey: queryKeys.trash,
    queryFn: () => api.fetchTrash(),
  });

export const versionsQuery = (noteId: string) =>
  queryOptions({
    queryKey: queryKeys.versions(noteId),
    queryFn: () => api.fetchVersions(noteId),
    enabled: !!noteId,
  });

export const userQuery = () =>
  queryOptions({
    queryKey: queryKeys.user,
    queryFn: () => api.fetchUser(),
    staleTime: Infinity,
  });

export const settingsQuery = () =>
  queryOptions({
    queryKey: queryKeys.settings,
    queryFn: () => api.fetchSettings(),
    staleTime: Infinity,
  });
