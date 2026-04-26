import { and, eq, isNull, isNotNull, like, lt, or, sql, asc, desc, inArray } from "drizzle-orm";
import { makeDb } from "./client";
import { notes, noteVersions } from "./schema";
import type { Note, NoteMeta, DeletedNoteMeta, NoteVersionMeta, NoteVersion } from "../../shared/types";

// Re-export for consumers that import from queries
export type { NoteMeta, DeletedNoteMeta, NoteVersionMeta, NoteVersion };
export type NoteRow = Note;

// --- Stats / parsing helpers (pure) ---

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

function computeStats(content: string) {
  const title = extractTitle(content);
  const preview = extractPreview(content);
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const taskDone = (content.match(/- \[x\]/gi) || []).length;
  const taskUndone = (content.match(/- \[ \]/g) || []).length;
  const tags = computeTags(content);
  return { title, preview, wordCount, taskDone, taskTotal: taskDone + taskUndone, tags };
}

// --- Row → wire shape mappers ---
// Drizzle returns column names as the JS field names from the schema
// (camelCase). The wire types we ship to the client (NoteMeta etc.) use
// snake_case to match the existing JSON contract on the API.

// Date columns are returned as JS Date by Drizzle. The wire format is ISO
// strings; convert at the boundary so the JSON contract stays stable.
const iso = (d: Date | null | undefined): string | null =>
  d == null ? null : d.toISOString();

function mapMeta(row: typeof notes.$inferSelect): NoteMeta {
  return {
    id: row.id,
    title: row.title,
    preview: row.preview,
    word_count: row.wordCount,
    task_done: row.taskDone,
    task_total: row.taskTotal,
    tags: row.tags,
    pinned: row.pinned,
    folder: row.folder,
    created_at: iso(row.createdAt)!,
    updated_at: iso(row.updatedAt)!,
  };
}

function mapNote(row: typeof notes.$inferSelect): Note {
  return {
    id: row.id,
    user_id: row.userId,
    title: row.title,
    content: row.content,
    preview: row.preview,
    word_count: row.wordCount,
    task_done: row.taskDone,
    task_total: row.taskTotal,
    tags: row.tags,
    pinned: row.pinned,
    folder: row.folder,
    deleted_at: iso(row.deletedAt),
    created_at: iso(row.createdAt)!,
    updated_at: iso(row.updatedAt)!,
  };
}

function mapVersionMeta(row: typeof noteVersions.$inferSelect): NoteVersionMeta {
  return {
    id: row.id,
    note_id: row.noteId,
    title: row.title,
    preview: row.preview,
    word_count: row.wordCount,
    created_at: iso(row.createdAt)!,
  };
}

function mapVersion(row: typeof noteVersions.$inferSelect): NoteVersion {
  return {
    id: row.id,
    note_id: row.noteId,
    user_id: row.userId,
    content: row.content,
    title: row.title,
    preview: row.preview,
    word_count: row.wordCount,
    created_at: iso(row.createdAt)!,
  };
}

// --- Notes ---

export async function listNotes(d1: D1Database, userId: string, query?: string): Promise<NoteMeta[]> {
  const db = makeDb(d1);
  let where = and(eq(notes.userId, userId), isNull(notes.deletedAt));
  if (query && query.trim()) {
    const pattern = `%${query.trim().replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    where = and(where, or(like(notes.title, pattern), like(notes.content, pattern)));
  }
  const rows = await db
    .select()
    .from(notes)
    .where(where)
    .orderBy(desc(notes.pinned), desc(notes.updatedAt));
  return rows.map(mapMeta);
}

export async function getNote(d1: D1Database, userId: string, noteId: string): Promise<NoteRow | null> {
  const db = makeDb(d1);
  const [row] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId), isNull(notes.deletedAt)))
    .limit(1);
  return row ? mapNote(row) : null;
}

export async function createNote(
  d1: D1Database,
  userId: string,
  title?: string,
  content?: string,
): Promise<NoteRow> {
  const db = makeDb(d1);
  const id = crypto.randomUUID().replace(/-/g, "");
  const c = content || "";
  const stats = computeStats(c);
  const t = title || stats.title;

  await db.insert(notes).values({
    id,
    userId,
    title: t,
    content: c,
    preview: stats.preview,
    wordCount: stats.wordCount,
    taskDone: stats.taskDone,
    taskTotal: stats.taskTotal,
    tags: JSON.stringify(stats.tags),
  });

  return (await getNote(d1, userId, id))!;
}

export async function updateNote(
  d1: D1Database,
  userId: string,
  noteId: string,
  updates: { title?: string; content?: string },
): Promise<NoteRow | null> {
  const existing = await getNote(d1, userId, noteId);
  if (!existing) return null;

  const content = updates.content ?? existing.content;
  const stats = computeStats(content);
  const title = updates.title ?? stats.title;

  const db = makeDb(d1);
  await db
    .update(notes)
    .set({
      title,
      content,
      preview: stats.preview,
      wordCount: stats.wordCount,
      taskDone: stats.taskDone,
      taskTotal: stats.taskTotal,
      tags: JSON.stringify(stats.tags),
      updatedAt: new Date(),
    })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));

  if (existing.content.trim().length > 0) {
    await createVersionSnapshot(d1, userId, noteId, existing);
  }

  return getNote(d1, userId, noteId);
}

export async function deleteNote(d1: D1Database, userId: string, noteId: string): Promise<boolean> {
  const db = makeDb(d1);
  const result = await db
    .update(notes)
    .set({ deletedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId), isNull(notes.deletedAt)));
  return (result.meta?.changes ?? 0) > 0;
}

export async function restoreNote(d1: D1Database, userId: string, noteId: string): Promise<boolean> {
  const db = makeDb(d1);
  const result = await db
    .update(notes)
    .set({ deletedAt: null })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId), isNotNull(notes.deletedAt)));
  return (result.meta?.changes ?? 0) > 0;
}

export async function listDeletedNotes(d1: D1Database, userId: string): Promise<DeletedNoteMeta[]> {
  const db = makeDb(d1);
  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      deletedAt: notes.deletedAt,
      createdAt: notes.createdAt,
    })
    .from(notes)
    .where(and(eq(notes.userId, userId), isNotNull(notes.deletedAt)))
    .orderBy(desc(notes.deletedAt));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    deleted_at: iso(r.deletedAt)!,
    created_at: iso(r.createdAt)!,
  }));
}

export async function permanentlyDeleteNote(d1: D1Database, userId: string, noteId: string): Promise<boolean> {
  const db = makeDb(d1);
  await db
    .delete(noteVersions)
    .where(and(eq(noteVersions.noteId, noteId), eq(noteVersions.userId, userId)));
  const result = await db
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
  return (result.meta?.changes ?? 0) > 0;
}

export async function purgeOldDeletedNotes(d1: D1Database, userId: string, daysOld = 30): Promise<number> {
  const db = makeDb(d1);
  const result = await db
    .delete(notes)
    .where(
      and(
        eq(notes.userId, userId),
        isNotNull(notes.deletedAt),
        lt(notes.deletedAt, new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)),
      ),
    );
  return result.meta?.changes ?? 0;
}

export async function togglePinNote(d1: D1Database, userId: string, noteId: string, pinned: boolean): Promise<boolean> {
  const db = makeDb(d1);
  const result = await db
    .update(notes)
    .set({ pinned: pinned ? 1 : 0 })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
  return (result.meta?.changes ?? 0) > 0;
}

// --- Folders ---

export async function moveToFolder(d1: D1Database, userId: string, noteId: string, folder: string | null): Promise<boolean> {
  const db = makeDb(d1);
  const result = await db
    .update(notes)
    .set({ folder })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
  return (result.meta?.changes ?? 0) > 0;
}

export async function renameFolder(d1: D1Database, userId: string, oldPath: string, newPath: string): Promise<number> {
  const db = makeDb(d1);
  const exact = await db
    .update(notes)
    .set({ folder: newPath })
    .where(and(eq(notes.userId, userId), eq(notes.folder, oldPath), isNull(notes.deletedAt)));
  const children = await db
    .update(notes)
    .set({ folder: sql`${newPath} || substr(${notes.folder}, ${oldPath.length + 1})` })
    .where(and(eq(notes.userId, userId), like(notes.folder, oldPath + "/%"), isNull(notes.deletedAt)));
  return (exact.meta?.changes ?? 0) + (children.meta?.changes ?? 0);
}

// --- Version History ---

const VERSION_THROTTLE_MS = 5 * 60 * 1000;
const VERSION_MAX_AGE_DAYS = 30;
const VERSION_MAX_COUNT = 100;

async function createVersionSnapshot(d1: D1Database, userId: string, noteId: string, note: NoteRow): Promise<void> {
  const db = makeDb(d1);
  const [last] = await db
    .select({ createdAt: noteVersions.createdAt })
    .from(noteVersions)
    .where(and(eq(noteVersions.noteId, noteId), eq(noteVersions.userId, userId)))
    .orderBy(desc(noteVersions.createdAt))
    .limit(1);

  if (last) {
    const elapsed = Date.now() - last.createdAt.getTime();
    if (elapsed < VERSION_THROTTLE_MS) return;
  }

  const stats = computeStats(note.content);
  await db.insert(noteVersions).values({
    id: crypto.randomUUID().replace(/-/g, ""),
    noteId,
    userId,
    content: note.content,
    title: note.title,
    preview: stats.preview,
    wordCount: stats.wordCount,
  });
}

export async function listNoteVersions(d1: D1Database, userId: string, noteId: string): Promise<NoteVersionMeta[]> {
  const db = makeDb(d1);

  // Lazy cleanup: drop versions older than VERSION_MAX_AGE_DAYS
  await db
    .delete(noteVersions)
    .where(
      and(
        eq(noteVersions.noteId, noteId),
        eq(noteVersions.userId, userId),
        lt(noteVersions.createdAt, new Date(Date.now() - VERSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000)),
      ),
    );

  // Trim to max count
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(noteVersions)
    .where(and(eq(noteVersions.noteId, noteId), eq(noteVersions.userId, userId)));

  if (cnt > VERSION_MAX_COUNT) {
    const excess = cnt - VERSION_MAX_COUNT;
    const oldest = await db
      .select({ id: noteVersions.id })
      .from(noteVersions)
      .where(and(eq(noteVersions.noteId, noteId), eq(noteVersions.userId, userId)))
      .orderBy(asc(noteVersions.createdAt))
      .limit(excess);
    if (oldest.length > 0) {
      await db.delete(noteVersions).where(inArray(noteVersions.id, oldest.map((r) => r.id)));
    }
  }

  const rows = await db
    .select()
    .from(noteVersions)
    .where(and(eq(noteVersions.noteId, noteId), eq(noteVersions.userId, userId)))
    .orderBy(desc(noteVersions.createdAt));
  return rows.map(mapVersionMeta);
}

export async function getNoteVersion(d1: D1Database, userId: string, versionId: string): Promise<NoteVersion | null> {
  const db = makeDb(d1);
  const [row] = await db
    .select()
    .from(noteVersions)
    .where(and(eq(noteVersions.id, versionId), eq(noteVersions.userId, userId)))
    .limit(1);
  return row ? mapVersion(row) : null;
}
