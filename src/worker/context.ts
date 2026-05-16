import type { Context } from "hono";

export function getExecutionContext(c: Context): ExecutionContext | undefined {
  try {
    return c.executionCtx;
  } catch {
    return undefined;
  }
}
