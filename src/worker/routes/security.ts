import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../types";
import { createStepUp, getAuthSession, hasValidStepUp, isFreshSession } from "../security";
import { getAuth } from "../auth";
import { getExecutionContext } from "../context";

type AuthVars = { userId: string; userEmail: string };

export const securityRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

securityRoutes.get("/step-up", async (c) => {
  const session = await getAuthSession(c.env, c.req.raw, getExecutionContext(c));
  if (!session?.session) return c.json({ verified: false }, 401);
  return c.json({ verified: isFreshSession(session) || (await hasValidStepUp(c.env, session)) });
});

securityRoutes.post("/step-up/fresh-session", async (c) => {
  const session = await getAuthSession(c.env, c.req.raw, getExecutionContext(c));
  if (!session?.session) return c.json({ error: "Unauthorized" }, 401);
  if (!isFreshSession(session)) return c.json({ error: "Fresh sign-in required" }, 403);
  await createStepUp(c.env, session);
  return c.json({ verified: true });
});

securityRoutes.post(
  "/step-up/totp",
  zValidator("json", z.object({ code: z.string().min(1) })),
  async (c) => {
    const session = await getAuthSession(c.env, c.req.raw, getExecutionContext(c));
    if (!session?.session) return c.json({ error: "Unauthorized" }, 401);

    const authUrl = new URL(c.req.url);
    authUrl.pathname = "/api/auth/two-factor/verify-totp";
    const upstream = await getAuth(c.env, c.req.url, getExecutionContext(c)).handler(
      new Request(authUrl, {
        method: "POST",
        headers: c.req.raw.headers,
        body: JSON.stringify({ code: c.req.valid("json").code }),
      }),
    );

    if (!upstream.ok) return c.json({ error: "Invalid authenticator code" }, 401);
    await createStepUp(c.env, session);
    return c.json({ verified: true });
  },
);
