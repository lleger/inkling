export interface NoteRow {
  id: string;
  user_id: string;
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
    // Skip blank lines between heading and tag zone
    if (trimmed.length === 0) {
      if (foundFirstTag) break; // blank after tags ends the zone
      continue; // blank before tags, keep looking
    }
    if (isTagZoneLine(trimmed)) {
      foundFirstTag = true;
      for (const t of trimmed.split(/\s+/)) {
        const match = t.match(TAG_RE);
        if (match) tags.push(match[1].toLowerCase());
      }
      continue;
    }
    break; // non-tag, non-blank line ends the search
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

    // Skip tag zone lines
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

const LIST_COLS = "id, title, preview, word_count, task_done, task_total, tags, created_at, updated_at";

export async function listNotes(db: D1Database, userId: string, query?: string): Promise<NoteMeta[]> {
  if (query && query.trim()) {
    const pattern = `%${query.trim()}%`;
    const result = await db
      .prepare(
        `SELECT ${LIST_COLS} FROM notes WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) ORDER BY updated_at DESC`,
      )
      .bind(userId, pattern, pattern)
      .all<NoteMeta>();
    return result.results;
  }

  const result = await db
    .prepare(`SELECT ${LIST_COLS} FROM notes WHERE user_id = ? ORDER BY updated_at DESC`)
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

  return getNote(db, userId, noteId);
}

export async function deleteNote(db: D1Database, userId: string, noteId: string): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM notes WHERE id = ? AND user_id = ?")
    .bind(noteId, userId)
    .run();
  return result.meta.changes > 0;
}
