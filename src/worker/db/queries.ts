export interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  preview: string;
  word_count: number;
  task_done: number;
  task_total: number;
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
  created_at: string;
  updated_at: string;
}

function computeStats(content: string) {
  const title = extractTitle(content);
  const preview = extractPreview(content);
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const taskDone = (content.match(/- \[x\]/gi) || []).length;
  const taskUndone = (content.match(/- \[ \]/g) || []).length;
  return { title, preview, wordCount, taskDone, taskTotal: taskDone + taskUndone };
}

function extractTitle(content: string): string {
  const headingMatch = content.match(/^#{1,6}\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();
  const firstLine = content.split("\n").find((line) => line.trim().length > 0);
  if (firstLine) return firstLine.trim().slice(0, 100);
  return "Untitled";
}

function extractPreview(content: string): string {
  const lines = content.split("\n");
  // Skip the first heading line, find the first content line
  let started = false;
  const parts: string[] = [];
  for (const line of lines) {
    if (!started && /^#{1,6}\s+/.test(line)) {
      started = true;
      continue;
    }
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      if (started) continue;
      started = true;
      continue;
    }
    // Strip markdown syntax for cleaner preview
    const clean = trimmed
      .replace(/^#{1,6}\s+/, "")
      .replace(/^[-*+]\s+(\[.\]\s+)?/, "")
      .replace(/^\d+\.\s+/, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/~~(.+?)~~/g, "$1");
    parts.push(clean);
    if (parts.join(" ").length >= 120) break;
  }
  return parts.join(" ").slice(0, 120);
}

export async function listNotes(db: D1Database, userId: string, query?: string): Promise<NoteMeta[]> {
  if (query && query.trim()) {
    const pattern = `%${query.trim()}%`;
    const result = await db
      .prepare(
        "SELECT id, title, preview, word_count, task_done, task_total, created_at, updated_at FROM notes WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) ORDER BY updated_at DESC",
      )
      .bind(userId, pattern, pattern)
      .all<NoteMeta>();
    return result.results;
  }

  const result = await db
    .prepare(
      "SELECT id, title, preview, word_count, task_done, task_total, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
    )
    .bind(userId)
    .all<NoteMeta>();
  return result.results;
}

export async function getNote(db: D1Database, userId: string, noteId: string): Promise<NoteRow | null> {
  return db
    .prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?")
    .bind(noteId, userId)
    .first<NoteRow>();
}

export async function createNote(
  db: D1Database,
  userId: string,
  title?: string,
  content?: string,
): Promise<NoteRow> {
  const id = crypto.randomUUID().replace(/-/g, "");
  const c = content || "";
  const stats = computeStats(c);
  const t = title || stats.title;

  await db
    .prepare(
      "INSERT INTO notes (id, user_id, title, content, preview, word_count, task_done, task_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(id, userId, t, c, stats.preview, stats.wordCount, stats.taskDone, stats.taskTotal)
    .run();

  return (await getNote(db, userId, id))!;
}

export async function updateNote(
  db: D1Database,
  userId: string,
  noteId: string,
  updates: { title?: string; content?: string },
): Promise<NoteRow | null> {
  const existing = await getNote(db, userId, noteId);
  if (!existing) return null;

  const content = updates.content ?? existing.content;
  const stats = computeStats(content);
  const title = updates.title ?? stats.title;

  await db
    .prepare(
      "UPDATE notes SET title = ?, content = ?, preview = ?, word_count = ?, task_done = ?, task_total = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? AND user_id = ?",
    )
    .bind(title, content, stats.preview, stats.wordCount, stats.taskDone, stats.taskTotal, noteId, userId)
    .run();

  return getNote(db, userId, noteId);
}

export async function deleteNote(db: D1Database, userId: string, noteId: string): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM notes WHERE id = ? AND user_id = ?")
    .bind(noteId, userId)
    .run();
  return result.meta.changes > 0;
}
