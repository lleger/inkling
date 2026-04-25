import { Hono } from "hono";
import type { Env } from "./types";
import { authMiddleware } from "./middleware/auth";
import { getAuth } from "./auth";
import { notesRoutes } from "./routes/notes";
import { userRoutes } from "./routes/user";
import { settingsRoutes } from "./routes/settings";

type AuthVars = { userId: string; userEmail: string };

const app = new Hono<{ Bindings: Env; Variables: AuthVars }>();

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
  const auth = getAuth(c.env, c.req.url);
  const upstream = await auth.handler(c.req.raw);
  const headers = new Headers({ "content-type": "application/json" });
  if (upstream.ok) {
    const setCookies = upstream.headers.getSetCookie?.() ?? [];
    for (const v of setCookies) headers.append("set-cookie", v);
  }
  // Body is identical for every outcome — frontend distinguishes by
  // calling getSession() afterwards.
  return new Response(JSON.stringify({}), { status: 200, headers });
});

app.all("/api/auth/*", (c) => {
  const auth = getAuth(c.env, c.req.url);
  return auth.handler(c.req.raw);
});

app.use("/api/*", authMiddleware);
app.route("/api/user", userRoutes);
app.route("/api/notes", notesRoutes);
app.route("/api/settings", settingsRoutes);

export default app;
