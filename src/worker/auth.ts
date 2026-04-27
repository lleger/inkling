import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { makeDb } from "./db/client";
import * as schema from "./db/schema";
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
export function getAuth(env: Env, requestUrl: string) {
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
      requireEmailVerification: false,
      autoSignIn: true,
    },
    socialProviders: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
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
    advanced: {
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: url.protocol === "https:",
      },
    },
  });
}

export type Auth = ReturnType<typeof getAuth>;
