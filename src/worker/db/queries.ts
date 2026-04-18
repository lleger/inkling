import type { Note, NoteMeta, DeletedNoteMeta, NoteVersionMeta, NoteVersion } from "../../shared/types";

// Re-export for consumers that import from queries
export type { NoteMeta, DeletedNoteMeta, NoteVersionMeta, NoteVersion };

// Server uses the full Note type as the row type
export type NoteRow = Note;

const TAG_RE = /^#([a-zA-Z0-9_-]+)$/;

function isTagZoneLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/);
  if (tokens.length === 0 || (tokens.length === 1 && tokens[0] === "")) return false;
  return tokens.every((t) => TAG_RE.test(t));
}

function computeTags(content: string): string[] {
  const lines = content.split("\n");
  let headingFound = false;
  let foundFirstTag = false;
  const tags: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!headingFound) {
      if (/^#{1,6}\s+/.test(trimmed)) headingFound = true;
      continue;
    }
    if (trimmed.length === 0) {
      if (foundFirstTag) break;
      continue;
    }
    if (isTagZoneLine(trimmed)) {
      foundFirstTag = true;
      for (const t of trimmed.split(/\s+/)) {
        const match = t.match(TAG_RE);
        if (match) tags.push(match[1].toLowerCase());
      }
      continue;
    }
    break;
  }

  return [...new Set(tags)];
}

function computeStats(content: string) {
  const title = extractTitle(content);
  const preview = extractPreview(content);
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const taskDone = (content.match(/- \[x\]/gi) || []).length;
  const taskUndone = (content.match(/- \[ \]/g) || []).length;
  const tags = computeTags(content);
  return { title, preview, wordCount, taskDone, taskTotal: taskDone + taskUndone, tags };
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
  let afterHeading = false;
  let pastTagZone = false;
  const parts: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!afterHeading) {
      if (/^#{1,6}\s+/.test(trimmed)) afterHeading = true;
      continue;
    }

    if (!pastTagZone) {
      if (isTagZoneLine(trimmed)) continue;
      pastTagZone = true;
    }

    if (trimmed.length === 0) continue;

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

const LIST_COLS = "id, title, preview, word_count, task_done, task_total, tags, pinned, created_at, updated_at";
const NOT_DELETED = "deleted_at IS NULL";

export async function listNotes(db: D1Database, userId: string, query?: string): Promise<NoteMeta[]> {
  if (query && query.trim()) {
    const escaped = query.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
    const pattern = `%${escaped}%`;
    const result = await db
      .prepare(
        `SELECT ${LIST_COLS} FROM notes WHERE user_id = ? AND ${NOT_DELETED} AND (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\') ORDER BY pinned DESC, updated_at DESC`,
      )
      .bind(userId, pattern, pattern)
      .all<NoteMeta>();
    return result.results;
  }

  const result = await db
    .prepare(`SELECT ${LIST_COLS} FROM notes WHERE user_id = ? AND ${NOT_DELETED} ORDER BY pinned DESC, updated_at DESC`)
    .bind(userId)
    .all<NoteMeta>();
  return result.results;
}

export async function getNote(db: D1Database, userId: string, noteId: string): Promise<NoteRow | null> {
  return db
    .prepare(`SELECT * FROM notes WHERE id = ? AND user_id = ? AND ${NOT_DELETED}`)
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
      "INSERT INTO notes (id, user_id, title, content, preview, word_count, task_done, task_total, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(id, userId, t, c, stats.preview, stats.wordCount, stats.taskDone, stats.taskTotal, JSON.stringify(stats.tags))
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
      "UPDATE notes SET title = ?, content = ?, preview = ?, word_count = ?, task_done = ?, task_total = ?, tags = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? AND user_id = ?",
    )
    .bind(title, content, stats.preview, stats.wordCount, stats.taskDone, stats.taskTotal, JSON.stringify(stats.tags), noteId, userId)
    .run();

  // Snapshot the pre-edit state if 5+ minutes since last version
  if (existing.content.trim().length > 0) {
    await createVersionSnapshot(db, userId, noteId, existing);
  }

  return getNote(db, userId, noteId);
}

// Soft delete — sets deleted_at timestamp
export async function deleteNote(db: D1Database, userId: string, noteId: string): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE notes SET deleted_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? AND user_id = ? AND ${NOT_DELETED}`,
    )
    .bind(noteId, userId)
    .run();
  return result.meta.changes > 0;
}

// Restore a soft-deleted note
export async function restoreNote(db: D1Database, userId: string, noteId: string): Promise<boolean> {
  const result = await db
    .prepare("UPDATE notes SET deleted_at = NULL WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL")
    .bind(noteId, userId)
    .run();
  return result.meta.changes > 0;
}

// List soft-deleted notes
export async function listDeletedNotes(db: D1Database, userId: string): Promise<DeletedNoteMeta[]> {
  const result = await db
    .prepare("SELECT id, title, deleted_at, created_at FROM notes WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC")
    .bind(userId)
    .all<DeletedNoteMeta>();
  return result.results;
}

// Permanently delete a note
export async function permanentlyDeleteNote(db: D1Database, userId: string, noteId: string): Promise<boolean> {
  // Cascade delete versions
  await db.prepare("DELETE FROM note_versions WHERE note_id = ? AND user_id = ?").bind(noteId, userId).run();
  const result = await db
    .prepare("DELETE FROM notes WHERE id = ? AND user_id = ?")
    .bind(noteId, userId)
    .run();
  return result.meta.changes > 0;
}

// Purge notes deleted more than N days ago
export async function purgeOldDeletedNotes(db: D1Database, userId: string, daysOld = 30): Promise<number> {
  const result = await db
    .prepare(
      `DELETE FROM notes WHERE user_id = ? AND deleted_at IS NOT NULL AND deleted_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-${daysOld} days')`,
    )
    .bind(userId)
    .run();
  return result.meta.changes;
}

export async function togglePinNote(db: D1Database, userId: string, noteId: string, pinned: boolean): Promise<boolean> {
  const result = await db
    .prepare("UPDATE notes SET pinned = ? WHERE id = ? AND user_id = ?")
    .bind(pinned ? 1 : 0, noteId, userId)
    .run();
  return result.meta.changes > 0;
}

// --- Version History ---

const VERSION_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
const VERSION_MAX_AGE_DAYS = 30;
const VERSION_MAX_COUNT = 100;

async function createVersionSnapshot(db: D1Database, userId: string, noteId: string, note: NoteRow): Promise<void> {
  // Check time since last version
  const lastVersion = await db
    .prepare("SELECT created_at FROM note_versions WHERE note_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(noteId, userId)
    .first<{ created_at: string }>();

  if (lastVersion) {
    const elapsed = Date.now() - new Date(lastVersion.created_at).getTime();
    if (elapsed < VERSION_THROTTLE_MS) return;
  }

  const stats = computeStats(note.content);
  await db
    .prepare("INSERT INTO note_versions (id, note_id, user_id, content, title, preview, word_count) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(
      crypto.randomUUID().replace(/-/g, ""),
      noteId,
      userId,
      note.content,
      note.title,
      stats.preview,
      stats.wordCount,
    )
    .run();
}

export async function listNoteVersions(db: D1Database, userId: string, noteId: string): Promise<NoteVersionMeta[]> {
  // Lazy cleanup
  await db
    .prepare(`DELETE FROM note_versions WHERE note_id = ? AND user_id = ? AND created_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-${VERSION_MAX_AGE_DAYS} days')`)
    .bind(noteId, userId)
    .run();

  // Trim to max count
  const countResult = await db
    .prepare("SELECT COUNT(*) as cnt FROM note_versions WHERE note_id = ? AND user_id = ?")
    .bind(noteId, userId)
    .first<{ cnt: number }>();

  if (countResult && countResult.cnt > VERSION_MAX_COUNT) {
    const excess = countResult.cnt - VERSION_MAX_COUNT;
    await db
      .prepare("DELETE FROM note_versions WHERE id IN (SELECT id FROM note_versions WHERE note_id = ? AND user_id = ? ORDER BY created_at ASC LIMIT ?)")
      .bind(noteId, userId, excess)
      .run();
  }

  const result = await db
    .prepare("SELECT id, note_id, title, preview, word_count, created_at FROM note_versions WHERE note_id = ? AND user_id = ? ORDER BY created_at DESC")
    .bind(noteId, userId)
    .all<NoteVersionMeta>();
  return result.results;
}

export async function getNoteVersion(db: D1Database, userId: string, versionId: string): Promise<NoteVersion | null> {
  return db
    .prepare("SELECT * FROM note_versions WHERE id = ? AND user_id = ?")
    .bind(versionId, userId)
    .first<NoteVersion>();
}
