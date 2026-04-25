import { betterAuth } from "better-auth";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import type { Env } from "./types";

/**
 * Build a better-auth instance bound to this request's env.
 *
 * In Cloudflare Workers we don't have stable globals for D1 — every request
 * gets its own env. We construct a fresh auth instance per request.
 */
export function getAuth(env: Env, requestUrl: string) {
  const url = new URL(requestUrl);
  return betterAuth({
    baseURL: url.origin,
    database: {
      db: new Kysely({ dialect: new D1Dialect({ database: env.DB }) }),
      type: "sqlite",
    },
    secret: env.BETTER_AUTH_SECRET || "dev-only-change-me",
    emailAndPassword: {
      enabled: true,
      // Skip email verification in dev — turn this on for production once you
      // wire up an email sender.
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
    advanced: {
      // Cookie attrs that work for SPA dev on http://localhost:5173
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: url.protocol === "https:",
      },
    },
  });
}

export type Auth = ReturnType<typeof getAuth>;
