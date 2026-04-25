/**
 * Test-only D1Database shim backed by better-sqlite3 (in-memory).
 *
 * Implements just enough of the D1 surface for Drizzle's d1 driver and
 * our Hono routes:
 *   - prepare(sql).bind(...).all()
 *   - prepare(sql).bind(...).first()
 *   - prepare(sql).bind(...).run()
 *   - prepare(sql).bind(...).raw()
 *   - batch([prep, prep, ...])
 *
 * Production code keeps using the real D1Database via the CF vite plugin.
 */
import Database, { type Database as Sqlite } from "better-sqlite3";

export function createTestD1(): D1Database {
  const sqlite: Sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");

  function prep(sql: string, bindings: unknown[] = []): D1PreparedStatement {
    return makePrepared(sqlite, sql, bindings);
  }

  return {
    prepare: (sql: string) => prep(sql),
    batch: async (statements: D1PreparedStatement[]) => {
      const out: D1Result[] = [];
      for (const s of statements) {
        const r = await s.run();
        out.push(r);
      }
      return out;
    },
    exec: async (sql: string) => {
      sqlite.exec(sql);
      return { count: 0, duration: 0 };
    },
    dump: async () => new ArrayBuffer(0),
  } as unknown as D1Database;
}

function makePrepared(sqlite: Sqlite, sql: string, bindings: unknown[]): D1PreparedStatement {
  return {
    bind(...newBindings: unknown[]) {
      return makePrepared(sqlite, sql, newBindings);
    },
    async first<T = unknown>(column?: string) {
      try {
        const stmt = sqlite.prepare(sql);
        const row = stmt.get(...bindings) as Record<string, unknown> | undefined;
        if (!row) return null;
        if (column) return (row[column] ?? null) as T;
        return row as T;
      } catch (err) {
        return handleError(err);
      }
    },
    async all<T = unknown>(): Promise<D1Result<T>> {
      try {
        const stmt = sqlite.prepare(sql);
        // SELECTs use .all(), writes use .run()
        if (stmt.reader) {
          const rows = stmt.all(...bindings) as T[];
          return {
            results: rows,
            success: true,
            meta: { changes: 0, duration: 0, last_row_id: 0, rows_read: rows.length, rows_written: 0 },
          } as D1Result<T>;
        } else {
          const info = stmt.run(...bindings);
          return {
            results: [],
            success: true,
            meta: {
              changes: info.changes,
              duration: 0,
              last_row_id: Number(info.lastInsertRowid),
              rows_read: 0,
              rows_written: info.changes,
            },
          } as D1Result<T>;
        }
      } catch (err) {
        return handleError(err);
      }
    },
    async run(): Promise<D1Result> {
      try {
        const stmt = sqlite.prepare(sql);
        if (stmt.reader) {
          // Some drivers .run() on selects; fall through to .all()
          const rows = stmt.all(...bindings);
          return {
            results: rows,
            success: true,
            meta: { changes: 0, duration: 0, last_row_id: 0, rows_read: rows.length, rows_written: 0 },
          } as unknown as D1Result;
        }
        const info = stmt.run(...bindings);
        return {
          results: [],
          success: true,
          meta: {
            changes: info.changes,
            duration: 0,
            last_row_id: Number(info.lastInsertRowid),
            rows_read: 0,
            rows_written: info.changes,
          },
        } as unknown as D1Result;
      } catch (err) {
        return handleError(err);
      }
    },
    async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]> {
      const stmt = sqlite.prepare(sql);
      stmt.raw(true);
      const rows = stmt.all(...bindings) as unknown[][];
      stmt.raw(false);
      if (options?.columnNames) {
        const columns = stmt.columns().map((c) => c.name);
        return [columns, ...rows] as T[];
      }
      return rows as T[];
    },
  } as unknown as D1PreparedStatement;
}

function handleError(err: unknown): never {
  throw err instanceof Error ? err : new Error(String(err));
}
