import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config — used to generate migrations from schema.ts.
 *
 * Usage:
 *   pnpm exec drizzle-kit generate  # diff schema.ts vs prior snapshot, write a migration
 *   pnpm run db:migrate:local       # apply generated migrations locally
 *
 * Existing migrate-*.sql files and schema.sql are legacy history. The
 * idempotent 0001_initial.sql migration bootstraps fresh D1 databases. New
 * schema changes should be made in src/worker/db/schema.ts and shipped as
 * migrations in src/worker/db/migrations/.
 */
export default defineConfig({
  schema: "./src/worker/db/schema.ts",
  out: "./src/worker/db/migrations",
  dialect: "sqlite",
  driver: "d1-http",
});
