# Deploy

Step-by-step for the first deploy of Inkling to Cloudflare Workers at `inkling.page`. Read top to bottom — order matters.

## Prerequisites

- `wrangler` logged in (`wrangler login`)
- A Cloudflare account with the `inkling.page` zone added (Add a Site → enter `inkling.page` → switch the registrar nameservers)

## 1. Create the production D1

```bash
pnpm exec wrangler d1 create inkling-db
```

Copy the `database_id` from the output and set it in `wrangler.jsonc`:

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

## 2. Apply migrations

```bash
pnpm run db:migrate          # runs against --remote
```

This applies SQL migrations from `src/worker/db/migrations/` via Wrangler. `0001_initial.sql` bootstraps fresh databases; `src/worker/db/schema.sql` is legacy reference SQL. New schema changes should be generated from `src/worker/db/schema.ts` with `pnpm run db:generate`.

Verify:

```bash
pnpm exec wrangler d1 execute inkling-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

You should see `notes`, `note_versions`, `user_settings`, `folder_metadata`, `note_refs`, `user`, `session`, `account`, `verification`.

## 3. Configure auth

Choose the sign-up mode explicitly in `wrangler.jsonc` vars or via deployed env vars:

```jsonc
"vars": {
  "SIGNUP_MODE": "allowlist",
  "ALLOWED_EMAILS": "you@example.com"
}
```

Use `SIGNUP_MODE=open` to allow anyone to sign up. `ALLOWED_EMAILS` is required only for allowlist mode and is matched case-insensitively.

Then set the auth secret.

Generate a fresh, strong, hex secret (do NOT reuse the one in `.dev.vars`):

```bash
openssl rand -hex 32 | pnpm exec wrangler secret put BETTER_AUTH_SECRET
```

Verify:

```bash
pnpm exec wrangler secret list
```

Optional Google OAuth requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## 4. Verify the custom domain

The `routes` block in `wrangler.jsonc` should point at the production domain:

```jsonc
"routes": [
  { "pattern": "inkling.page", "custom_domain": true },
  { "pattern": "www.inkling.page", "custom_domain": true }
],
```

Commit any domain/config changes before deploying.

## 5. Deploy

```bash
pnpm run deploy
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

Then in a browser: visit `https://inkling.page/`, sign up with an allowed email when using allowlist mode, and create a note.

## Updating later

For schema changes: edit `src/worker/db/schema.ts`, run `pnpm run db:generate` to produce a migration in `src/worker/db/migrations/`, apply with `pnpm run db:migrate` for production or `pnpm run db:migrate:local` for local dev, then redeploy.

For app code: just `pnpm run deploy`.

## Operational

**Reset a user's password (lost-credentials recovery):**

```bash
SQL=$(node scripts/reset-password.mjs <email> <new-password>)
pnpm exec wrangler d1 execute inkling-db --remote --command "$SQL"
```

**Read the live allowlist / signup mode:**

```bash
pnpm exec wrangler tail --format=pretty
# then trigger any auth request and watch logs
```

(Or check `wrangler.jsonc` directly if they are configured as non-sensitive `vars`.)

**Rotate `BETTER_AUTH_SECRET`:** running `wrangler secret put BETTER_AUTH_SECRET` again invalidates all existing sessions on next deploy. Users will need to sign in again.
