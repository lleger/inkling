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

  // Dev fallback — only when DEV_MODE is on AND no session.
  // Tests may pass X-Test-User-Id to impersonate a specific user.
  if (c.env.DEV_MODE === "true") {
    const testUserId = c.req.header("X-Test-User-Id");
    c.set("userId", testUserId || "dev-user");
    c.set("userEmail", testUserId ? `${testUserId}@test.local` : "dev@localhost");
    return next();
  }

  return c.json({ error: "Unauthorized" }, 401);
});
