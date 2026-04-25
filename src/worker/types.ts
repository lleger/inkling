export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** Comma-separated email allowlist. If unset, signup is open to anyone. */
  ALLOWED_EMAILS?: string;
  /**
   * Test-only auth bypass. Set to "1" by unit tests to skip session
   * checks. NEVER set this outside of test code — the wrangler prod
   * config does not include it.
   */
  TEST_AUTH_BYPASS?: string;
}
