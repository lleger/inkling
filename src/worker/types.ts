export interface Env {
  DB: D1Database;
  DEV_MODE?: string;
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** Comma-separated email allowlist. If unset, signup is open to anyone. */
  ALLOWED_EMAILS?: string;
}
