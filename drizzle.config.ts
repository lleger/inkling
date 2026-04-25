import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config — used to generate migrations from schema.ts.
 *
 * Usage:
 *   npx drizzle-kit generate          # diff schema.ts vs prior snapshot, write a migration
 *   npx wrangler d1 execute writer-db --local --file=src/worker/db/migrations/<file>
 *
 * For now, the existing migrate-001..008 SQL files were applied by hand and
 * remain the source of truth for the live schema. New schema changes should
 * be made in src/worker/db/schema.ts and shipped as drizzle-generated SQL.
 */
export default defineConfig({
  schema: "./src/worker/db/schema.ts",
  out: "./src/worker/db/migrations",
  dialect: "sqlite",
  driver: "d1-http",
});
