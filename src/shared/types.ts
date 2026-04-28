// Shared types between client and worker.
// Both bundles import from here to avoid duplication.

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  preview: string;
  word_count: number;
  task_done: number;
  task_total: number;
  tags: string;
  pinned: number;
  folder: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteMeta {
  id: string;
  title: string;
  preview: string;
  word_count: number;
  task_done: number;
  task_total: number;
  tags: string;
  pinned: number;
  folder: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeletedNoteMeta {
  id: string;
  title: string;
  deleted_at: string;
  created_at: string;
}

export interface User {
  sub: string;
  email: string;
}

export type SaveStatus = "saved" | "saving" | "unsaved";
export type EditorMode = "markdown" | "richtext" | "split";
export type AccentColor = "green" | "blue" | "purple" | "orange" | "rose" | "teal";

export interface NoteVersionMeta {
  id: string;
  note_id: string;
  title: string;
  preview: string;
  word_count: number;
  created_at: string;
}

export interface NoteVersion {
  id: string;
  note_id: string;
  user_id: string;
  content: string;
  title: string;
  preview: string;
  word_count: number;
  created_at: string;
}

export interface Settings {
  theme: "light" | "dark" | "system";
  accent: AccentColor;
  defaultMode: EditorMode;
  smartTypography: boolean;
  dailyNoteFolder: string;
}

export interface OgPreview {
  url: string;
  finalUrl: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}
