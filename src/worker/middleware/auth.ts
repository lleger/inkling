import { createMiddleware } from "hono/factory";
import type { Env } from "../types";

type AuthVars = {
  userId: string;
  userEmail: string;
};

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AuthVars;
}>(async (c, next) => {
  const jwt = c.req.header("Cf-Access-Jwt-Assertion");

  if (!jwt) {
    // Dev mode fallback
    if (c.env.DEV_MODE === "true") {
      c.set("userId", "dev-user");
      c.set("userEmail", "dev@localhost");
      return next();
    }
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) {
      return c.json({ error: "Invalid token" }, 401);
    }

    // Decode the payload (middle segment)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));

    // Basic expiry check
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json({ error: "Token expired" }, 401);
    }

    const sub = payload.sub;
    const email = payload.email;

    if (!sub) {
      return c.json({ error: "Missing user identity" }, 401);
    }

    c.set("userId", sub);
    c.set("userEmail", email || "unknown");
    return next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});
