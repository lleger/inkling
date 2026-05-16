import { queryOptions } from "@tanstack/react-query";
import * as api from "./api";

export const queryKeys = {
  notes: ["notes"] as const,
  note: (id: string) => ["notes", id] as const,
  trash: ["trash"] as const,
  versions: (noteId: string) => ["versions", noteId] as const,
  version: (noteId: string, versionId: string) => ["versions", noteId, versionId] as const,
  user: ["user"] as const,
  settings: ["settings"] as const,
  ogPreview: (url: string) => ["og", url] as const,
  backlinks: (noteId: string) => ["backlinks", noteId] as const,
  folderMetadata: ["folder-metadata"] as const,
  attachments: (noteId: string) => ["attachments", noteId] as const,
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

export const versionQuery = (noteId: string, versionId: string | null) =>
  queryOptions({
    queryKey: queryKeys.version(noteId, versionId ?? ""),
    queryFn: () => api.fetchVersion(noteId, versionId!),
    enabled: !!noteId && !!versionId,
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

// Server already TTLs the upstream fetch via Cache-Control, so we trust
// it on our side and treat the query as never-stale until the user hits
// the refresh button.
export const ogPreviewQuery = (url: string) =>
  queryOptions({
    queryKey: queryKeys.ogPreview(url),
    queryFn: () => api.fetchOgPreview(url),
    staleTime: Infinity,
    enabled: !!url,
    retry: false,
  });

export const backlinksQuery = (noteId: string) =>
  queryOptions({
    queryKey: queryKeys.backlinks(noteId),
    queryFn: () => api.fetchBacklinks(noteId),
    enabled: !!noteId,
  });

export const folderMetadataQuery = () =>
  queryOptions({
    queryKey: queryKeys.folderMetadata,
    queryFn: () => api.fetchFolderMetadata(),
  });

export const attachmentsQuery = (noteId: string) =>
  queryOptions({
    queryKey: queryKeys.attachments(noteId),
    queryFn: () => api.fetchAttachments(noteId),
    enabled: !!noteId,
  });
