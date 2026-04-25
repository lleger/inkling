import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/** Build a Drizzle client bound to this request's D1 binding. */
export function makeDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type DB = ReturnType<typeof makeDb>;
