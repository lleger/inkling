// Create or recreate the local-only QA user used by Claude for browser
// walkthroughs. Bypasses ALLOWED_EMAILS by writing to user/account
// directly.
//
// Reads QA_EMAIL and QA_PASSWORD from process.env (loaded from .env via
// mise). Inserts via `wrangler d1 execute --local` so it goes through
// the same binding the dev server uses.
//
// Usage:
//   node scripts/create-qa-user.mjs
//
// Idempotent: re-running updates the user's password to match .env.

import { hashPassword } from "@better-auth/utils/password";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Load .env if env vars aren't already set (mise auto-loads when you cd in,
// but `node script.mjs` outside the mise shell won't have them).
function loadDotenv() {
  try {
    for (const line of readFileSync(".env", "utf-8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    // No .env — fine, env vars may already be set externally.
  }
}
loadDotenv();

const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;

if (!email || !password) {
  console.error("QA_EMAIL and QA_PASSWORD must be set in .env");
  process.exit(1);
}

const hash = await hashPassword(password);
const userId = randomBytes(16).toString("hex");
const accountId = randomBytes(16).toString("hex");
const now = Date.now();

// SQLite-escape: double single quotes
const esc = (s) => s.replace(/'/g, "''");

const sql = [
  `DELETE FROM session WHERE userId IN (SELECT id FROM user WHERE email='${esc(email)}');`,
  `DELETE FROM account WHERE userId IN (SELECT id FROM user WHERE email='${esc(email)}');`,
  `DELETE FROM user WHERE email='${esc(email)}';`,
  `INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES ('${userId}', 'QA', '${esc(email)}', 1, ${now}, ${now});`,
  `INSERT INTO account (id, userId, providerId, accountId, password, createdAt, updatedAt) VALUES ('${accountId}', '${userId}', 'credential', '${userId}', '${esc(hash)}', ${now}, ${now});`,
].join("\n");

// Wrangler chokes on multi-statement --command (newlines get escaped by the
// shell). Write to a temp file and use --file instead.
const tmpFile = join(tmpdir(), `qa-user-${process.pid}.sql`);
writeFileSync(tmpFile, sql);
try {
  execSync(`npx wrangler d1 execute inkling-db --local --file=${tmpFile}`, {
    stdio: "inherit",
  });
} finally {
  unlinkSync(tmpFile);
}

console.log(`\nQA user ready: ${email}`);
