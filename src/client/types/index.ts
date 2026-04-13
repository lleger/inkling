export interface Note {
  id: string;
  title: string;
  content: string;
  preview: string;
  word_count: number;
  task_done: number;
  task_total: number;
  tags: string;
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
  created_at: string;
  updated_at: string;
}

export interface User {
  sub: string;
  email: string;
}

export type SaveStatus = "saved" | "saving" | "unsaved";
export type EditorMode = "markdown" | "richtext" | "split";
