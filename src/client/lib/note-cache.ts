import type { QueryClient } from "@tanstack/react-query";
import type { DeletedNoteMeta, Note, NoteMeta } from "../types";
import { queryKeys } from "./queries";

export function noteToMeta(note: Note): NoteMeta {
  return {
    id: note.id,
    title: note.title,
    preview: note.preview,
    word_count: note.word_count,
    task_done: note.task_done,
    task_total: note.task_total,
    tags: note.tags,
    pinned: note.pinned,
    folder: note.folder,
    created_at: note.created_at,
    updated_at: note.updated_at,
  };
}

export function upsertCachedNoteMeta(qc: QueryClient, meta: NoteMeta) {
  qc.setQueryData<NoteMeta[]>(queryKeys.notes, (prev) => {
    if (!prev) return [meta];
    const exists = prev.some((note) => note.id === meta.id);
    return exists ? prev.map((note) => (note.id === meta.id ? meta : note)) : [meta, ...prev];
  });
}

export function writeCachedNote(qc: QueryClient, note: Note) {
  qc.setQueryData(queryKeys.note(note.id), note);
  upsertCachedNoteMeta(qc, noteToMeta(note));
}

export function patchCachedNote(qc: QueryClient, id: string, patch: Partial<NoteMeta>) {
  qc.setQueryData<NoteMeta[]>(queryKeys.notes, (prev) =>
    prev?.map((note) => (note.id === id ? { ...note, ...patch } : note)),
  );
  qc.setQueryData<Note>(queryKeys.note(id), (prev) => (prev ? { ...prev, ...patch } : prev));
}

export function removeCachedNoteMeta(qc: QueryClient, id: string) {
  qc.setQueryData<NoteMeta[]>(queryKeys.notes, (prev) => prev?.filter((note) => note.id !== id));
}

export function addCachedTrashEntry(qc: QueryClient, meta: NoteMeta, deletedAt = new Date()) {
  qc.setQueryData<DeletedNoteMeta[]>(queryKeys.trash, (prev) => {
    const entry: DeletedNoteMeta = {
      id: meta.id,
      title: meta.title,
      deleted_at: deletedAt.toISOString(),
      created_at: meta.created_at,
    };
    return prev ? [entry, ...prev.filter((note) => note.id !== meta.id)] : [entry];
  });
}

export function removeCachedTrashEntry(qc: QueryClient, id: string) {
  qc.setQueryData<DeletedNoteMeta[]>(queryKeys.trash, (prev) =>
    prev?.filter((note) => note.id !== id),
  );
}

export function invalidateNotes(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.notes });
}

export function invalidateNoteLists(qc: QueryClient) {
  invalidateNotes(qc);
  qc.invalidateQueries({ queryKey: queryKeys.trash });
}

export function invalidateBacklinks(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["backlinks"] });
}
