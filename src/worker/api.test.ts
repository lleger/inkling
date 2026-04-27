import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import app from "./index";
import { createTestD1 } from "./db/test-d1";

// In-memory D1-compatible database backed by better-sqlite3. Drizzle queries
// run unmodified through it; the surface implements just enough of D1 for
// our routes and Drizzle's d1 driver.
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Untitled',
    content TEXT NOT NULL DEFAULT '',
    preview TEXT NOT NULL DEFAULT '',
    word_count INTEGER NOT NULL DEFAULT 0,
    task_done INTEGER NOT NULL DEFAULT 0,
    task_total INTEGER NOT NULL DEFAULT 0,
    tags TEXT NOT NULL DEFAULT '[]',
    pinned INTEGER NOT NULL DEFAULT 0,
    folder TEXT DEFAULT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );
  CREATE TABLE IF NOT EXISTS note_versions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    note_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    title TEXT NOT NULL,
    preview TEXT NOT NULL DEFAULT '',
    word_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    settings TEXT NOT NULL DEFAULT '{}'
  );
`;

let db: D1Database;

beforeAll(async () => {
  db = createTestD1();
  for (const stmt of SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await db.prepare(stmt).run();
  }
});


// Tests bypass real session creation via TEST_AUTH_BYPASS=1 in env.
// Real auth (better-auth sessions) is exercised by acceptance tests.
const TEST_USER_ID = "test-user";
const TEST_USER_EMAIL = "test@local";

function authHeaders() {
  return { "Content-Type": "application/json" };
}

describe("API", () => {
  beforeEach(async () => {
    // Reset data between tests; schema is created once in beforeAll
    await db.batch([
      db.prepare("DELETE FROM notes"),
      db.prepare("DELETE FROM note_versions"),
      db.prepare("DELETE FROM user_settings"),
    ]);
  });

  const TEST_ENV = {
    DB: db,
    BETTER_AUTH_SECRET: "test-secret-not-used-but-required",
    SIGNUP_MODE: "open",
    TEST_AUTH_BYPASS: "1",
  } as const;

  function req(path: string, init?: RequestInit) {
    return app.request(path, init, { ...TEST_ENV, DB: db });
  }

  describe("GET /api/health", () => {
    it("returns ok without auth", async () => {
      const res = await req("/api/health");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });
  });

  describe("auth middleware", () => {
    it("returns 401 without a session and without TEST_AUTH_BYPASS", async () => {
      const env = { ...TEST_ENV, DB: db, TEST_AUTH_BYPASS: undefined };
      const res = await app.request("/api/user", {}, env);
      expect(res.status).toBe(401);
    });

    it("allows the test auth bypass when explicitly enabled", async () => {
      const res = await req("/api/user");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ sub: TEST_USER_ID, email: TEST_USER_EMAIL });
    });
  });

  describe("notes CRUD", () => {
    it("lists notes (empty)", async () => {
      const res = await req("/api/notes", { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { notes: unknown[] };
      expect(body.notes).toEqual([]);
    });

    it("creates a note with computed stats", async () => {
      const res = await req("/api/notes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: "# Hello\n\nThis is a test note." }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { note: Record<string, unknown> };
      expect(body.note.title).toBe("Hello");
      expect(body.note.word_count).toBe(7);
      expect(body.note.preview).toBeTruthy();
    });

    it("gets a note by id", async () => {
      const createRes = await req("/api/notes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: "hello" }),
      });
      const { note } = (await createRes.json()) as { note: { id: string } };

      const res = await req(`/api/notes/${note.id}`, { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { note: { content: string } };
      expect(body.note.content).toBe("hello");
    });

    it("returns 404 for nonexistent note", async () => {
      const res = await req("/api/notes/nonexistent", { headers: authHeaders() });
      expect(res.status).toBe(404);
    });

    it("updates a note and recomputes stats", async () => {
      const createRes = await req("/api/notes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: "old" }),
      });
      const { note } = (await createRes.json()) as { note: { id: string } };

      const res = await req(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ content: "# New Title\n\n- [ ] task one\n- [x] task two\n\nupdated content here" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { note: Record<string, unknown> };
      expect(body.note.title).toBe("New Title");
      expect(body.note.task_total).toBe(2);
      expect(body.note.task_done).toBe(1);
    });

    it("deletes a note", async () => {
      const createRes = await req("/api/notes", {
        method: "POST",
        headers: authHeaders(),
        body: "{}",
      });
      const { note } = (await createRes.json()) as { note: { id: string } };

      const delRes = await req(`/api/notes/${note.id}`, { method: "DELETE", headers: authHeaders() });
      expect(delRes.status).toBe(200);

      const getRes = await req(`/api/notes/${note.id}`, { headers: authHeaders() });
      expect(getRes.status).toBe(404);
    });

    it("soft-deleted note can be restored", async () => {
      const createRes = await req("/api/notes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: "restore me" }),
      });
      const { note } = (await createRes.json()) as { note: { id: string } };

      // Delete
      await req(`/api/notes/${note.id}`, { method: "DELETE", headers: authHeaders() });
      const listRes = await req("/api/notes", { headers: authHeaders() });
      expect(((await listRes.json()) as { notes: unknown[] }).notes).toHaveLength(0);

      // Restore
      const restoreRes = await req(`/api/notes/${note.id}/restore`, { method: "POST", headers: authHeaders() });
      expect(restoreRes.status).toBe(200);

      // Should be back
      const getRes = await req(`/api/notes/${note.id}`, { headers: authHeaders() });
      expect(getRes.status).toBe(200);
    });

    it("lists deleted notes in trash", async () => {
      const createRes = await req("/api/notes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: "trash me" }),
      });
      const { note } = (await createRes.json()) as { note: { id: string } };
      await req(`/api/notes/${note.id}`, { method: "DELETE", headers: authHeaders() });

      const trashRes = await req("/api/notes/trash/list", { headers: authHeaders() });
      expect(trashRes.status).toBe(200);
      const body = (await trashRes.json()) as { notes: { id: string }[] };
      expect(body.notes).toHaveLength(1);
      expect(body.notes[0].id).toBe(note.id);
    });

    it("permanently deletes a note", async () => {
      const createRes = await req("/api/notes", {
        method: "POST",
        headers: authHeaders(),
        body: "{}",
      });
      const { note } = (await createRes.json()) as { note: { id: string } };
      await req(`/api/notes/${note.id}`, { method: "DELETE", headers: authHeaders() });

      const permRes = await req(`/api/notes/${note.id}/permanent`, { method: "DELETE", headers: authHeaders() });
      expect(permRes.status).toBe(200);

      // Can't restore anymore
      const restoreRes = await req(`/api/notes/${note.id}/restore`, { method: "POST", headers: authHeaders() });
      expect(restoreRes.status).toBe(404);
    });

    it("isolates notes between users", async () => {
      await req("/api/notes", {
        method: "POST",
        headers: { ...authHeaders(), "X-Test-User-Id": "user-1" },
        body: JSON.stringify({ content: "user1 note" }),
      });

      const res = await req("/api/notes", {
        headers: { ...authHeaders(), "X-Test-User-Id": "user-2" },
      });
      const body = (await res.json()) as { notes: unknown[] };
      expect(body.notes).toEqual([]);
    });

    it("list returns stats but not content", async () => {
      await req("/api/notes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: "some content here" }),
      });

      const res = await req("/api/notes", { headers: authHeaders() });
      const body = (await res.json()) as { notes: Record<string, unknown>[] };
      expect(body.notes).toHaveLength(1);
      expect(body.notes[0]).not.toHaveProperty("content");
      expect(body.notes[0]).toHaveProperty("word_count");
      expect(body.notes[0]).toHaveProperty("preview");
    });

    it("searches notes by content", async () => {
      await req("/api/notes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: "# Apples\n\nI love apples" }),
      });
      await req("/api/notes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: "# Bananas\n\nI love bananas" }),
      });

      const res = await req("/api/notes?q=apples", { headers: authHeaders() });
      const body = (await res.json()) as { notes: Record<string, unknown>[] };
      expect(body.notes).toHaveLength(1);
      expect(body.notes[0].title).toBe("Apples");
    });

    it("returns all notes when search is empty", async () => {
      await req("/api/notes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: "note one" }),
      });
      await req("/api/notes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: "note two" }),
      });

      const res = await req("/api/notes?q=", { headers: authHeaders() });
      const body = (await res.json()) as { notes: unknown[] };
      expect(body.notes).toHaveLength(2);
    });
  });
});
