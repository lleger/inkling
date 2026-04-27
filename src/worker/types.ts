export interface Env {
  DB: D1Database;
  /** Required. better-auth session HMAC secret. Worker fails fast if unset. */
  BETTER_AUTH_SECRET?: string;
  /**
   * Required. Sign-up policy:
   *   "allowlist" — only emails in ALLOWED_EMAILS may register
   *   "open"      — anyone with a valid email may register
   * Worker fails fast on any other value (including unset). Forces operators
   * to choose explicitly so a config drift can't silently flip to open.
   */
  SIGNUP_MODE?: string;
  /** Comma-separated email allowlist. Required when SIGNUP_MODE=allowlist. */
  ALLOWED_EMAILS?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /**
   * Test-only auth bypass. The middleware ONLY honors this when
   * `import.meta.env.MODE === "test"`, so the branch is dead-code
   * eliminated from dev and prod bundles regardless of env value.
   */
  TEST_AUTH_BYPASS?: string;
}
