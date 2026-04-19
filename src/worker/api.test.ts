import { describe, it, expect, beforeEach } from "vitest";
import app from "./index";

// Minimal D1-compatible in-memory mock
function createMockD1(): D1Database {
  const rows = new Map<string, Record<string, unknown>>();

  function exec(sql: string, bindings: unknown[] = []): { results: Record<string, unknown>[]; meta: { changes: number } } {
    const trimmed = sql.trim();

    if (/^CREATE\b/i.test(trimmed)) {
      return { results: [], meta: { changes: 0 } };
    }

    // INSERT with 8 fields
    if (/INSERT INTO notes/i.test(trimmed)) {
      const [id, user_id, title, content, preview, word_count, task_done, task_total, tags] = bindings;
      const now = new Date().toISOString();
      rows.set(id as string, {
        id, user_id, title, content, preview,
        word_count, task_done, task_total, tags,
        pinned: 0, folder: null, deleted_at: null, created_at: now, updated_at: now,
      });
      return { results: [], meta: { changes: 1 } };
    }

    // SELECT * WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    if (/SELECT \* FROM notes WHERE id = \? AND user_id = \?/i.test(trimmed)) {
      const [id, uid] = bindings as string[];
      const row = rows.get(id);
      if (row && row.user_id === uid && !row.deleted_at) return { results: [row], meta: { changes: 0 } };
      return { results: [], meta: { changes: 0 } };
    }

    // SELECT list with search
    if (/SELECT id, title, preview.*FROM notes WHERE.*LIKE/i.test(trimmed)) {
      const [uid, pattern] = bindings as string[];
      const searchTerm = (pattern as string).replace(/%/g, "").toLowerCase();
      const results = [...rows.values()]
        .filter((r) => r.user_id === uid && !r.deleted_at && (
          (r.title as string).toLowerCase().includes(searchTerm) ||
          (r.content as string).toLowerCase().includes(searchTerm)
        ))
        .map(({ id, title, preview, word_count, task_done, task_total, tags, pinned, folder, created_at, updated_at }) => ({
          id, title, preview, word_count, task_done, task_total, tags, pinned, folder, created_at, updated_at,
        }))
        .sort((a, b) => (b.updated_at as string).localeCompare(a.updated_at as string));
      return { results, meta: { changes: 0 } };
    }

    // SELECT list (no search)
    if (/SELECT id, title, preview.*FROM notes WHERE user_id = \?/i.test(trimmed)) {
      const [uid] = bindings as string[];
      const results = [...rows.values()]
        .filter((r) => r.user_id === uid && !r.deleted_at)
        .map(({ id, title, preview, word_count, task_done, task_total, tags, pinned, folder, created_at, updated_at }) => ({
          id, title, preview, word_count, task_done, task_total, tags, pinned, folder, created_at, updated_at,
        }))
        .sort((a, b) => (b.updated_at as string).localeCompare(a.updated_at as string));
      return { results, meta: { changes: 0 } };
    }

    // Move to folder
    if (/UPDATE notes SET folder/i.test(trimmed)) {
      const [folder, id, uid] = bindings;
      const row = rows.get(id as string);
      if (row && row.user_id === uid) {
        row.folder = folder;
        return { results: [], meta: { changes: 1 } };
      }
      return { results: [], meta: { changes: 0 } };
    }

    // Pin toggle
    if (/UPDATE notes SET pinned/i.test(trimmed)) {
      const [pinned, id, uid] = bindings;
      const row = rows.get(id as string);
      if (row && row.user_id === uid) {
        row.pinned = pinned;
        return { results: [], meta: { changes: 1 } };
      }
      return { results: [], meta: { changes: 0 } };
    }

    // Restore (UPDATE SET deleted_at = NULL) — must be before general UPDATE
    if (/UPDATE notes SET deleted_at = NULL/i.test(trimmed)) {
      const [id, uid] = bindings as string[];
      const row = rows.get(id);
      if (row && row.user_id === uid && row.deleted_at) {
        row.deleted_at = null;
        return { results: [], meta: { changes: 1 } };
      }
      return { results: [], meta: { changes: 0 } };
    }

    // Soft delete (UPDATE SET deleted_at) — must be before general UPDATE
    if (/UPDATE notes SET deleted_at = /i.test(trimmed)) {
      const [id, uid] = bindings as string[];
      const row = rows.get(id);
      if (row && row.user_id === uid && !row.deleted_at) {
        row.deleted_at = new Date().toISOString();
        return { results: [], meta: { changes: 1 } };
      }
      return { results: [], meta: { changes: 0 } };
    }

    // UPDATE with 9 bindings (content update)
    if (/UPDATE notes SET title/i.test(trimmed)) {
      const [title, content, preview, word_count, task_done, task_total, tags, id, uid] = bindings;
      const row = rows.get(id as string);
      if (row && row.user_id === uid) {
        Object.assign(row, { title, content, preview, word_count, task_done, task_total, tags, updated_at: new Date().toISOString() });
        return { results: [], meta: { changes: 1 } };
      }
      return { results: [], meta: { changes: 0 } };
    }

    // List deleted notes
    if (/SELECT id, title, deleted_at, created_at FROM notes WHERE user_id = \? AND deleted_at IS NOT NULL/i.test(trimmed)) {
      const [uid] = bindings as string[];
      const results = [...rows.values()]
        .filter((r) => r.user_id === uid && r.deleted_at)
        .map(({ id, title, deleted_at, created_at }) => ({ id, title, deleted_at, created_at }))
        .sort((a, b) => (b.deleted_at as string).localeCompare(a.deleted_at as string));
      return { results, meta: { changes: 0 } };
    }

    // Permanent delete
    if (/DELETE FROM notes WHERE id = \? AND user_id = \?/i.test(trimmed)) {
      const [id, uid] = bindings as string[];
      const row = rows.get(id);
      if (row && row.user_id === uid) {
        rows.delete(id);
        return { results: [], meta: { changes: 1 } };
      }
      return { results: [], meta: { changes: 0 } };
    }

    // Purge old deleted notes (in mock, don't actually purge — tests use fresh data)
    if (/DELETE FROM notes WHERE user_id = \? AND deleted_at IS NOT NULL AND deleted_at </i.test(trimmed)) {
      return { results: [], meta: { changes: 0 } };
    }

    if (/DROP TABLE/i.test(trimmed)) {
      rows.clear();
      return { results: [], meta: { changes: 0 } };
    }

    return { results: [], meta: { changes: 0 } };
  }

  return {
    prepare(sql: string) {
      let boundValues: unknown[] = [];
      return {
        bind(...values: unknown[]) {
          boundValues = values;
          return this;
        },
        async first<T>(): Promise<T | null> {
          const { results } = exec(sql, boundValues);
          return (results[0] as T) ?? null;
        },
        async all<T>(): Promise<{ results: T[] }> {
          const { results } = exec(sql, boundValues);
          return { results: results as T[] };
        },
        async run() {
          const result = exec(sql, boundValues);
          return { meta: result.meta };
        },
      };
    },
    async exec(sql: string) {
      for (const stmt of sql.split(";").filter((s) => s.trim())) {
        exec(stmt);
      }
      return { count: 0, duration: 0 };
    },
  } as unknown as D1Database;
}

function makeJwt(payload: Record<string, unknown>): string {
  return `header.${btoa(JSON.stringify(payload))}.signature`;
}

function authHeaders(sub = "user-1", email = "a@b.com") {
  return {
    "Cf-Access-Jwt-Assertion": makeJwt({ sub, email }),
    "Content-Type": "application/json",
  };
}

describe("API", () => {
  let db: D1Database;

  beforeEach(() => {
    db = createMockD1();
  });

  function req(path: string, init?: RequestInit) {
    return app.request(path, init, { DB: db });
  }

  describe("GET /api/health", () => {
    it("returns ok without auth", async () => {
      const res = await req("/api/health");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });
  });

  describe("auth middleware", () => {
    it("returns 401 without JWT and without dev mode", async () => {
      const res = await req("/api/user");
      expect(res.status).toBe(401);
    });

    it("allows dev mode fallback", async () => {
      const res = await app.request("/api/user", {}, { DB: db, DEV_MODE: "true" });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ sub: "dev-user", email: "dev@localhost" });
    });

    it("returns 401 for JWT missing sub", async () => {
      const res = await req("/api/user", {
        headers: { "Cf-Access-Jwt-Assertion": makeJwt({ email: "test@test.com" }) },
      });
      expect(res.status).toBe(401);
    });

    it("extracts identity from valid JWT", async () => {
      const res = await req("/api/user", { headers: authHeaders("user-123", "test@example.com") });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ sub: "user-123", email: "test@example.com" });
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
        headers: authHeaders("user-1"),
        body: JSON.stringify({ content: "user1 note" }),
      });

      const res = await req("/api/notes", { headers: authHeaders("user-2") });
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
