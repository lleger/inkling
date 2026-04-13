import { Hono } from "hono";
import type { Env } from "../types";

type AuthVars = { userId: string; userEmail: string };

export const userRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

userRoutes.get("/", (c) => {
  return c.json({
    sub: c.get("userId"),
    email: c.get("userEmail"),
  });
});
