// Generate a better-auth scrypt password hash and print the SQL to update
// the account.password row. Better-auth's credential provider stores the
// user.id (NOT the email) in account.accountId, so we join on user.email.
//
// Usage:
//   node scripts/reset-password.mjs <email> <new-password>
//   # then run the printed SQL against your D1:
//   npx wrangler d1 execute inkling-db --local --command "<sql>"
//   # or for production:
//   npx wrangler d1 execute inkling-db --remote --command "<sql>"

import { hashPassword } from "@better-auth/utils/password";

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error("Usage: node scripts/reset-password.mjs <email> <new-password>");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters");
  process.exit(1);
}

const hash = await hashPassword(password);
const safeEmail = email.replace(/'/g, "''");
const safeHash = hash.replace(/'/g, "''");

console.log(
  `UPDATE account SET password='${safeHash}' WHERE providerId='credential' AND accountId IN (SELECT id FROM user WHERE email='${safeEmail}');`
);
