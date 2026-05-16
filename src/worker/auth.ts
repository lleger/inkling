import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { passkey } from "@better-auth/passkey";
import { twoFactor } from "better-auth/plugins/two-factor";
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
  const baseUrl = new URL(requestUrl);
  return betterAuth({
    appName: "Inkling",
    baseURL: baseUrl.origin,
    database: drizzleAdapter(makeDb(env.DB), {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        twoFactor: schema.twoFactor,
        passkey: schema.passkey,
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
      onPasswordReset: async ({ user }) => {
        waitForEmail(
          ctx,
          sendAuthEmail(env, {
            to: user.email,
            subject: "Your Inkling password was reset",
            title: "Password reset complete",
            body: "Your Inkling password was reset and existing sessions were revoked. If this wasn't you, review your account security immediately.",
            actionText: "Open Inkling",
            actionUrl: new URL(requestUrl).origin,
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
            body: "Confirm this email address to finish setting up your Inkling account or complete an email change.",
            actionText: "Verify email",
            actionUrl: url,
          }),
        );
      },
    },
    user: {
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
          waitForEmail(
            ctx,
            sendAuthEmail(env, {
              to: user.email,
              subject: "Confirm your Inkling email change",
              title: "Confirm email change",
              body: `Confirm changing your Inkling sign-in email to ${newEmail}. After confirming, check ${newEmail} for a second verification link to complete the change. If this wasn't you, ignore this email and review your account security.`,
              actionText: "Confirm email change",
              actionUrl: url,
            }),
          );
        },
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
      twoFactor({
        issuer: "Inkling",
      }),
      passkey({
        rpID: baseUrl.hostname,
        rpName: "Inkling",
        origin: baseUrl.origin,
      }),
    ],
    advanced: {
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: baseUrl.protocol === "https:",
      },
    },
  });
}

export type Auth = ReturnType<typeof getAuth>;
