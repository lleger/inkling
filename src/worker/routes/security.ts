import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../types";
import {
  createStepUp,
  getAuthSession,
  hasValidStepUp,
  isFreshSession,
  requireStepUp,
  securityNotice,
} from "../security";
import { getAuth } from "../auth";
import { getExecutionContext } from "../context";

type AuthVars = { userId: string; userEmail: string };

export const securityRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

function isAllowedEmail(env: Env, email: string) {
  if (env.SIGNUP_MODE !== "allowlist") return true;
  const allowlist = new Set(
    (env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  return allowlist.has(email.trim().toLowerCase());
}

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

securityRoutes.post(
  "/change-password",
  zValidator(
    "json",
    z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(1),
      revokeOtherSessions: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const stepUp = await requireStepUp(c.env, c.req.raw, getExecutionContext(c));
    if (!stepUp.ok) return stepUp.response;

    const authUrl = new URL(c.req.url);
    authUrl.pathname = "/api/auth/change-password";
    const res = await getAuth(c.env, c.req.url, getExecutionContext(c)).handler(
      new Request(authUrl, {
        method: "POST",
        headers: c.req.raw.headers,
        body: JSON.stringify(c.req.valid("json")),
      }),
    );
    if (res.ok) {
      securityNotice(
        c.env,
        getExecutionContext(c),
        stepUp.session.user.email,
        "Your Inkling password was changed",
        "Password changed",
        "Your Inkling password was changed from Settings. If this wasn't you, reset your password and review your account security.",
      );
    }
    return res;
  },
);

securityRoutes.post(
  "/change-email",
  zValidator(
    "json",
    z.object({
      newEmail: z.email(),
      callbackURL: z.string().optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid("json");
    if (!isAllowedEmail(c.env, body.newEmail)) {
      return c.json({ error: "This email is not on the allowlist." }, 403);
    }

    const stepUp = await requireStepUp(c.env, c.req.raw, getExecutionContext(c));
    if (!stepUp.ok) return stepUp.response;

    const authUrl = new URL(c.req.url);
    authUrl.pathname = "/api/auth/change-email";
    return getAuth(c.env, c.req.url, getExecutionContext(c)).handler(
      new Request(authUrl, {
        method: "POST",
        headers: c.req.raw.headers,
        body: JSON.stringify(body),
      }),
    );
  },
);
