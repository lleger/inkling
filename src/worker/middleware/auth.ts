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

  // Test-only auth bypass. Honored ONLY when TEST_AUTH_BYPASS is "1".
  // The unit test harness passes this in the env arg to app.request().
  // Production wrangler config never sets it, so this branch is unreachable
  // in deployed environments. Don't put TEST_AUTH_BYPASS in .dev.vars.
  if (c.env.TEST_AUTH_BYPASS === "1") {
    const testUserId = c.req.header("X-Test-User-Id");
    c.set("userId", testUserId || "test-user");
    c.set("userEmail", testUserId ? `${testUserId}@test.local` : "test@local");
    return next();
  }

  return c.json({ error: "Unauthorized" }, 401);
});
