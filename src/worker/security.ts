import { and, eq, gt } from "drizzle-orm";
import { makeDb } from "./db/client";
import { verification } from "./db/schema";
import { sendAuthEmail } from "./email";
import { getAuth } from "./auth";
import type { Env } from "./types";

const STEP_UP_TTL_MS = 15 * 60 * 1000;
const FRESH_SESSION_MS = 2 * 60 * 1000;

type SessionData = {
  session: { id: string; createdAt: Date | string };
  user: { id: string; email: string };
} | null;

export function stepUpIdentifier(sessionId: string) {
  return `step-up:${sessionId}`;
}

export async function getAuthSession(env: Env, request: Request, ctx?: ExecutionContext) {
  const auth = getAuth(env, request.url, ctx);
  return auth.api.getSession({ headers: request.headers });
}

export function isFreshSession(session: NonNullable<SessionData>) {
  return Date.now() - new Date(session.session.createdAt).getTime() < FRESH_SESSION_MS;
}

export async function createStepUp(env: Env, session: NonNullable<SessionData>) {
  const db = makeDb(env.DB);
  const identifier = stepUpIdentifier(session.session.id);
  await db.delete(verification).where(eq(verification.identifier, identifier));
  await db.insert(verification).values({
    id: crypto.randomUUID(),
    identifier,
    value: session.user.id,
    expiresAt: new Date(Date.now() + STEP_UP_TTL_MS),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function hasValidStepUp(env: Env, session: NonNullable<SessionData>) {
  const db = makeDb(env.DB);
  const [row] = await db
    .select({ id: verification.id })
    .from(verification)
    .where(
      and(
        eq(verification.identifier, stepUpIdentifier(session.session.id)),
        eq(verification.value, session.user.id),
        gt(verification.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function requireStepUp(env: Env, request: Request, ctx?: ExecutionContext) {
  const session = await getAuthSession(env, request, ctx);
  if (!session?.session)
    return { ok: false as const, response: new Response("Unauthorized", { status: 401 }) };
  if (isFreshSession(session) || (await hasValidStepUp(env, session))) {
    return { ok: true as const, session };
  }
  return {
    ok: false as const,
    response: Response.json({ error: "Step-up authentication required" }, { status: 403 }),
  };
}

export function securityNotice(
  env: Env,
  ctx: ExecutionContext | undefined,
  to: string,
  subject: string,
  title: string,
  body: string,
) {
  const task = sendAuthEmail(env, {
    to,
    subject,
    title,
    body,
    actionText: "Open Inkling",
    actionUrl: "https://inkling.page",
  });
  if (ctx) ctx.waitUntil(task);
  else void task;
}
