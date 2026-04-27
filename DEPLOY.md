# Deploy

Step-by-step for the first deploy of Inkling to Cloudflare Workers at `inkling.page`. Read top to bottom — order matters.

## Prerequisites

- `wrangler` logged in (`wrangler login`)
- A Cloudflare account with the `inkling.page` zone added (Add a Site → enter `inkling.page` → switch the registrar nameservers)

## 1. Create the production D1

```bash
npx wrangler d1 create inkling-db
```

Copy the `database_id` from the output and replace `local-dev-placeholder` in `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "inkling-db",
    "database_id": "<paste-the-real-id-here>"
  }
]
```

Commit this change.

## 2. Apply the schema

```bash
npm run db:migrate          # runs against --remote
```

(Equivalent to `npx wrangler d1 execute inkling-db --file=src/worker/db/schema.sql`.)

Verify:

```bash
npx wrangler d1 execute inkling-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

You should see `notes`, `note_versions`, `user_settings`, `user`, `session`, `account`, `verification`.

## 3. Set the auth secret

Generate a fresh, strong, hex secret (do NOT reuse the one in `.dev.vars`):

```bash
openssl rand -hex 32 | npx wrangler secret put BETTER_AUTH_SECRET
```

Verify:

```bash
npx wrangler secret list
```

## 4. Wire up the custom domain

Uncomment the `routes` block in `wrangler.jsonc`:

```jsonc
"routes": [
  { "pattern": "inkling.page", "custom_domain": true },
  { "pattern": "www.inkling.page", "custom_domain": true }
],
```

Commit it.

## 5. Deploy

```bash
npm run deploy
```

(Runs `vite build` then `wrangler deploy`.)

Wrangler will:
- Build the worker + SPA assets
- Validate `secrets.required` is satisfied
- Create the custom-domain DNS records and provision the cert
- Push the worker

## 6. Smoke test

```bash
curl https://inkling.page/api/health
# {"ok":true}
```

Then in a browser: visit `https://inkling.page/`, sign up with an email on `ALLOWED_EMAILS`, create a note.

## Updating later

For schema changes: edit `src/worker/db/schema.ts`, run `npx drizzle-kit generate` to produce a migration in `src/worker/db/migrations/`, apply with `npx wrangler d1 execute inkling-db --remote --file=src/worker/db/migrations/<file>`, then redeploy.

For app code: just `npm run deploy`.

## Operational

**Reset a user's password (lost-credentials recovery):**

```bash
SQL=$(node scripts/reset-password.mjs <email> <new-password>)
npx wrangler d1 execute inkling-db --remote --command "$SQL"
```

**Read the live allowlist / signup mode:**

```bash
npx wrangler tail --format=pretty
# then trigger any auth request and watch logs
```

(Or check `wrangler.jsonc` directly — they're non-sensitive `vars`.)

**Rotate `BETTER_AUTH_SECRET`:** running `wrangler secret put BETTER_AUTH_SECRET` again invalidates all existing sessions on next deploy. Users will need to sign in again.
