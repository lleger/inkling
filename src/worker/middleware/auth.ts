import { createMiddleware } from "hono/factory";
import type { Env } from "../types";
import { getAuth } from "../auth";

type AuthVars = {
  userId: string;
  userEmail: string;
};

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AuthVars;
}>(async (c, next) => {
  const auth = getAuth(c.env, c.req.url);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (session?.user) {
    c.set("userId", session.user.id);
    c.set("userEmail", session.user.email);
    return next();
  }

  // Test-only bypass. Vite substitutes `import.meta.env.MODE` at build time,
  // so this branch is dead-code-eliminated from dev (`"development"`) and
  // production (`"production"`) bundles. Only the vitest build (`"test"`)
  // keeps it live, AND only when the test env explicitly opts in. An
  // operator who fat-fingers TEST_AUTH_BYPASS=1 in prod cannot reach this.
  if (import.meta.env.MODE === "test" && c.env.TEST_AUTH_BYPASS === "1") {
    const testUserId = c.req.header("X-Test-User-Id");
    c.set("userId", testUserId || "test-user");
    c.set("userEmail", testUserId ? `${testUserId}@test.local` : "test@local");
    return next();
  }

  return c.json({ error: "Unauthorized" }, 401);
});
