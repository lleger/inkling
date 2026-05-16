import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { makeDb } from "./db/client";
import * as schema from "./db/schema";
import { sendAuthEmail } from "./email";
import type { Env } from "./types";

type SignupMode = "allowlist" | "open";

function getSignupMode(env: Env): SignupMode {
  if (env.SIGNUP_MODE === "allowlist" || env.SIGNUP_MODE === "open") {
    return env.SIGNUP_MODE;
  }
  throw new Error(
    `SIGNUP_MODE must be "allowlist" or "open" (got: ${JSON.stringify(env.SIGNUP_MODE)})`,
  );
}

function parseAllowlist(env: Env): Set<string> {
  if (!env.ALLOWED_EMAILS) {
    throw new Error("ALLOWED_EMAILS is required when SIGNUP_MODE=allowlist");
  }
  const set = new Set<string>();
  for (const e of env.ALLOWED_EMAILS.split(",")) {
    const trimmed = e.trim().toLowerCase();
    if (trimmed) set.add(trimmed);
  }
  if (set.size === 0) {
    throw new Error("ALLOWED_EMAILS parsed to an empty set");
  }
  return set;
}

/**
 * Build a better-auth instance bound to this request's env.
 *
 * In Cloudflare Workers we don't have stable globals for D1 — every request
 * gets its own env. We construct a fresh auth instance per request.
 *
 * Throws on missing BETTER_AUTH_SECRET, missing/invalid SIGNUP_MODE, or
 * empty allowlist when SIGNUP_MODE=allowlist. Failing loud is intentional —
 * misconfiguration shouldn't silently weaken security posture.
 */
function waitForEmail(ctx: ExecutionContext | undefined, task: Promise<unknown>) {
  if (ctx) {
    ctx.waitUntil(task);
    return;
  }
  void task;
}

export function getAuth(env: Env, requestUrl: string, ctx?: ExecutionContext) {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required");
  }
  const signupMode = getSignupMode(env);
  const allowlist = signupMode === "allowlist" ? parseAllowlist(env) : null;
  const url = new URL(requestUrl);
  return betterAuth({
    baseURL: url.origin,
    database: drizzleAdapter(makeDb(env.DB), {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        waitForEmail(
          ctx,
          sendAuthEmail(env, {
            to: user.email,
            subject: "Reset your Inkling password",
            title: "Reset your password",
            body: "Use this link to choose a new password for your Inkling account. It expires in 1 hour.",
            actionText: "Reset password",
            actionUrl: url,
          }),
        );
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        waitForEmail(
          ctx,
          sendAuthEmail(env, {
            to: user.email,
            subject: "Verify your Inkling email",
            title: "Verify your email",
            body: "Confirm this email address to finish setting up your Inkling account.",
            actionText: "Verify email",
            actionUrl: url,
          }),
        );
      },
    },
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : undefined,
    databaseHooks: allowlist
      ? {
          user: {
            create: {
              before: async (user) => {
                const email = user.email?.toLowerCase();
                if (!email || !allowlist.has(email)) {
                  throw new APIError("FORBIDDEN", {
                    message: "This email is not on the allowlist.",
                  });
                }
                return { data: user };
              },
            },
          },
        }
      : undefined,
    plugins: [
      magicLink({
        disableSignUp: true,
        expiresIn: 300,
        sendMagicLink: async ({ email, url }) => {
          waitForEmail(
            ctx,
            sendAuthEmail(env, {
              to: email,
              subject: "Sign in to Inkling",
              title: "Your sign-in link",
              body: "Use this link to sign in to Inkling. It expires in 5 minutes.",
              actionText: "Sign in",
              actionUrl: url,
            }),
          );
        },
      }),
    ],
    advanced: {
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: url.protocol === "https:",
      },
    },
  });
}

export type Auth = ReturnType<typeof getAuth>;
