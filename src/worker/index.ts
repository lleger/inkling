import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import type { Env } from "./types";
import { getExecutionContext } from "./context";
import { authMiddleware } from "./middleware/auth";
import { getAuth } from "./auth";
import { makeDb } from "./db/client";
import { passkey, user, verification } from "./db/schema";
import { notesRoutes } from "./routes/notes";
import { userRoutes } from "./routes/user";
import { settingsRoutes } from "./routes/settings";
import { ogRoutes } from "./routes/og";
import { foldersRoutes } from "./routes/folders";
import { attachmentsRoutes } from "./routes/attachments";
import { securityRoutes } from "./routes/security";
import { requireStepUp, securityNotice } from "./security";

type AuthVars = { userId: string; userEmail: string };

const app = new Hono<{ Bindings: Env; Variables: AuthVars }>();

app.onError((err, c) => {
  console.error("[worker] unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

app.get("/api/health", (c) => c.json({ ok: true }));

// better-auth — must be mounted BEFORE the auth middleware so /api/auth/*
// can be reached without a session (login, signup, callback, etc.)

// Sign-up is wrapped to prevent account-enumeration: every response body is
// identical (200 + a fixed message). Legitimate sign-ups still get a
// session cookie via the Set-Cookie header, so auto-sign-in works.
// Failure cases (email not on allowlist, email already exists, etc.) get
// the same body and no cookie. An attacker probing the endpoint can only
// learn whether they got a cookie — same as the inevitable side-effect of
// "you are now signed in."
app.post("/api/auth/sign-up/email", async (c) => {
  const auth = getAuth(c.env, c.req.url, getExecutionContext(c));
  let setCookies: string[] = [];
  try {
    const upstream = await auth.handler(c.req.raw);
    if (upstream.ok) {
      setCookies = upstream.headers.getSetCookie?.() ?? [];
    }
  } catch (err) {
    // Better-auth throws on validation/allowlist failure. Swallow — the
    // generic 200 below already hides outcome from the client. Logged
    // server-side for debugging.
    console.error("[sign-up] upstream error:", err);
  }
  const headers = new Headers({ "content-type": "application/json" });
  for (const v of setCookies) headers.append("set-cookie", v);
  // Body is identical for every outcome — frontend distinguishes by
  // calling getSession() afterwards.
  return new Response(JSON.stringify({}), { status: 200, headers });
});

app.post("/api/auth/reset-password", async (c) => {
  const body = (await c.req.raw
    .clone()
    .json()
    .catch(() => null)) as { token?: string } | null;
  const token = body?.token || new URL(c.req.url).searchParams.get("token");
  if (token) {
    const db = makeDb(c.env.DB);
    const [resetToken] = await db
      .select({ userId: verification.value })
      .from(verification)
      .where(eq(verification.identifier, `reset-password:${token}`))
      .limit(1);
    if (resetToken) {
      const [account] = await db
        .select({ twoFactorEnabled: user.twoFactorEnabled })
        .from(user)
        .where(eq(user.id, resetToken.userId))
        .limit(1);
      const [existingPasskey] = await db
        .select({ id: passkey.id })
        .from(passkey)
        .where(eq(passkey.userId, resetToken.userId))
        .limit(1);
      if (existingPasskey && !account?.twoFactorEnabled) {
        return c.json(
          {
            error:
              "This account uses passkeys. Use a passkey to sign in, or contact support for high-risk recovery.",
          },
          403,
        );
      }
    }
  }

  return getAuth(c.env, c.req.url, getExecutionContext(c)).handler(c.req.raw.clone() as Request);
});

app.get("/api/auth/verify-email", async (c) => {
  const url = new URL(c.req.url);
  const token = url.searchParams.get("token");
  if (token) {
    try {
      const jwt = await jwtVerify(token, new TextEncoder().encode(c.env.BETTER_AUTH_SECRET), {
        algorithms: ["HS256"],
      });
      const requestType = jwt.payload.requestType;
      if (requestType === "change-email-confirmation") {
        url.searchParams.set("callbackURL", "/settings/security?emailChange=check-new-email");
      } else if (requestType === "change-email-verification") {
        url.searchParams.set("callbackURL", "/settings/security?emailChange=changed");
      }
    } catch {
      // Better Auth will return the authoritative invalid/expired-token response.
    }
  }
  return getAuth(c.env, c.req.url, getExecutionContext(c)).handler(new Request(url, c.req.raw));
});

app.all("/api/auth/passkey/generate-register-options", async (c) => {
  const stepUp = await requireStepUp(c.env, c.req.raw, getExecutionContext(c));
  if (!stepUp.ok) return stepUp.response;
  return getAuth(c.env, c.req.url, getExecutionContext(c)).handler(c.req.raw.clone() as Request);
});

app.post("/api/auth/passkey/delete-passkey", async (c) => {
  const stepUp = await requireStepUp(c.env, c.req.raw, getExecutionContext(c));
  if (!stepUp.ok) return stepUp.response;
  const body = (await c.req.raw
    .clone()
    .json()
    .catch(() => null)) as { id?: string } | null;
  const db = makeDb(c.env.DB);
  const [account] = await db
    .select({ twoFactorEnabled: user.twoFactorEnabled })
    .from(user)
    .where(eq(user.id, stepUp.session.user.id))
    .limit(1);
  const existingPasskeys = await db
    .select({ id: passkey.id })
    .from(passkey)
    .where(eq(passkey.userId, stepUp.session.user.id))
    .limit(2);
  if (body?.id && existingPasskeys.length <= 1 && !account?.twoFactorEnabled) {
    return c.json(
      {
        error: "Add another passkey or enable authenticator app 2FA before removing this passkey.",
      },
      400,
    );
  }
  const res = await getAuth(c.env, c.req.url, getExecutionContext(c)).handler(
    c.req.raw.clone() as Request,
  );
  if (res.ok) {
    securityNotice(
      c.env,
      getExecutionContext(c),
      stepUp.session.user.email,
      "Inkling passkey removed",
      "Passkey removed",
      "A passkey was removed from your Inkling account. If this wasn't you, reset your password and review your account security.",
    );
  }
  return res;
});

app.post("/api/auth/passkey/update-passkey", async (c) => {
  return getAuth(c.env, c.req.url, getExecutionContext(c)).handler(c.req.raw.clone() as Request);
});

app.post("/api/auth/two-factor/disable", async (c) => {
  const stepUp = await requireStepUp(c.env, c.req.raw, getExecutionContext(c));
  if (!stepUp.ok) return stepUp.response;
  const [existingPasskey] = await makeDb(c.env.DB)
    .select({ id: passkey.id })
    .from(passkey)
    .where(eq(passkey.userId, stepUp.session.user.id))
    .limit(1);
  if (!existingPasskey) {
    return c.json({ error: "Add a passkey before disabling authenticator app 2FA." }, 400);
  }
  const res = await getAuth(c.env, c.req.url, getExecutionContext(c)).handler(
    c.req.raw.clone() as Request,
  );
  if (res.ok) {
    securityNotice(
      c.env,
      getExecutionContext(c),
      stepUp.session.user.email,
      "Inkling two-factor authentication disabled",
      "Two-factor authentication disabled",
      "Authenticator app 2FA was disabled for your Inkling account. If this wasn't you, reset your password and review your account security.",
    );
  }
  return res;
});

app.post("/api/auth/two-factor/verify-totp", async (c) => {
  const session = await getAuth(c.env, c.req.url, getExecutionContext(c)).api.getSession({
    headers: c.req.raw.headers,
  });
  const wasDisabled =
    session?.user && !(session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled;
  const res = await getAuth(c.env, c.req.url, getExecutionContext(c)).handler(
    c.req.raw.clone() as Request,
  );
  if (res.ok && session?.user?.email && wasDisabled) {
    securityNotice(
      c.env,
      getExecutionContext(c),
      session.user.email,
      "Inkling two-factor authentication enabled",
      "Two-factor authentication enabled",
      "Authenticator app 2FA was enabled for your Inkling account. If this wasn't you, review your account security.",
    );
  }
  return res;
});

app.post("/api/auth/passkey/verify-registration", async (c) => {
  const session = await requireStepUp(c.env, c.req.raw, getExecutionContext(c));
  if (!session.ok) return session.response;
  const res = await getAuth(c.env, c.req.url, getExecutionContext(c)).handler(
    c.req.raw.clone() as Request,
  );
  if (res.ok) {
    securityNotice(
      c.env,
      getExecutionContext(c),
      session.session.user.email,
      "New Inkling passkey added",
      "New passkey added",
      "A new passkey was added to your Inkling account. If this wasn't you, remove it and reset your password.",
    );
  }
  return res;
});

app.all("/api/auth/*", async (c) => {
  const auth = getAuth(c.env, c.req.url, getExecutionContext(c));
  try {
    return await auth.handler(c.req.raw.clone() as Request);
  } catch (err) {
    console.error("[auth] handler threw:", err);
    return c.json({ error: "Authentication request failed. Please try again." }, 500);
  }
});

app.use("/api/*", authMiddleware);
app.route("/api/security", securityRoutes);
app.route("/api/user", userRoutes);
app.route("/api/notes", notesRoutes);
app.route("/api/settings", settingsRoutes);
app.route("/api/og", ogRoutes);
app.route("/api/folders", foldersRoutes);
app.route("/api/attachments", attachmentsRoutes);

export default app;
