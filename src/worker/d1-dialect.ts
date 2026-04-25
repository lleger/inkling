/**
 * Minimal Kysely dialect for Cloudflare D1.
 *
 * Adapted from kysely-d1@0.4.0, with the deprecated `numUpdatedOrDeletedRows`
 * field removed (modern Kysely warns about it).
 */
import {
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type CompiledQuery,
  type DatabaseConnection,
  type Dialect,
  type Driver,
  type Kysely,
  type QueryResult,
} from "kysely";

export interface D1DialectConfig {
  database: D1Database;
}

export class D1Dialect implements Dialect {
  constructor(private readonly config: D1DialectConfig) {}
  createAdapter() { return new SqliteAdapter(); }
  createDriver(): Driver { return new D1Driver(this.config); }
  createQueryCompiler() { return new SqliteQueryCompiler(); }
  createIntrospector(db: Kysely<unknown>) { return new SqliteIntrospector(db); }
}

class D1Driver implements Driver {
  constructor(private readonly config: D1DialectConfig) {}
  async init() {}
  async acquireConnection(): Promise<DatabaseConnection> {
    return new D1Connection(this.config);
  }
  async beginTransaction() { throw new Error("Transactions are not supported yet."); }
  async commitTransaction() { throw new Error("Transactions are not supported yet."); }
  async rollbackTransaction() { throw new Error("Transactions are not supported yet."); }
  async releaseConnection() {}
  async destroy() {}
}

class D1Connection implements DatabaseConnection {
  constructor(private readonly config: D1DialectConfig) {}

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const result = await this.config.database
      .prepare(compiledQuery.sql)
      .bind(...compiledQuery.parameters)
      .all<R>();
    if (result.error) throw new Error(result.error);
    const changes = result.meta?.changes ?? 0;
    const lastRowId = result.meta?.last_row_id;
    return {
      insertId: lastRowId == null ? undefined : BigInt(lastRowId),
      numAffectedRows: changes > 0 ? BigInt(changes) : undefined,
      rows: result.results ?? [],
    };
  }

  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("D1 driver does not support streaming");
  }
}
