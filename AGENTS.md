# Project Instructions

## Architecture

React 19 + TanStack Router + TanStack Query frontend, Hono API on Cloudflare Workers with D1 (SQLite).

- **Routes**: `src/client/routes/` — file-based, generated route tree at `src/client/routeTree.gen.ts`
  - `__root.tsx` — outermost suspense boundary
  - `_app.tsx` — main shell layout (sidebar, modals, command palette, toast)
  - `_app.index.tsx` — `/` (home)
  - `_app.notes.$id.tsx` — `/notes/:id` (editor)
  - `_app.notes.$id_.versions.tsx` — `/notes/:id/versions` (trailing `_` breaks out of parent layout)
  - `_app.today.tsx` — `/today` (find/create today's daily note, then redirect)
  - `_app.trash.tsx` — `/trash`
  - `login.tsx` — `/login` (sign in / sign up)
- **Components**: `src/client/components/` — Lexical editor, sidebar, modals, etc.
- **Hooks**: `src/client/hooks/` — `useNotes`, `useUser`, `useSettings`, `useTheme`. Built on TanStack Query.
- **Queries**: `src/client/lib/queries.ts` — central query keys and `queryOptions` factories
- **UI Context**: `src/client/context/UIContext.tsx` — ephemeral UI state shared across routes (sidebar/focus/palette/settings/folder/meta panel toggles, toast)
- **Backend**: `src/worker/` — Hono API + Drizzle ORM, auth middleware
  - `src/worker/routes/` — authenticated Hono routes for notes, folders, settings, user, and OG previews
  - `src/worker/middleware/auth.ts` — better-auth session middleware for `/api/*`
  - `src/worker/db/schema.ts` — Drizzle table definitions (notes, versions, settings, folder metadata, note refs, better-auth tables)
  - `src/worker/db/queries.ts` — query functions, all Drizzle
  - `src/worker/db/client.ts` — `makeDb(env.DB)` builds a Drizzle client per request
  - `src/worker/db/test-d1.ts` — better-sqlite3-backed D1 shim for unit tests
  - `src/worker/db/migrate-*.sql` — historical SQL migrations applied by hand
  - `src/worker/db/migrations/` — active Wrangler D1 migrations. New schema changes go in `schema.ts` then `pnpm run db:generate` produces a migration here.
- **Shared types**: `src/shared/types.ts`
- **Pure lib**: `src/client/lib/` — framework-agnostic utilities

### Dev Setup

Single server: `pnpm run dev` (Vite + `@cloudflare/vite-plugin`). Runs frontend + worker + D1 in one process on port 5173.

### Data flow

All server data flows through TanStack Query. To force a refetch, invalidate the query key:

```ts
queryClient.invalidateQueries({ queryKey: queryKeys.notes });
```

When adding a new mutation, set `onSuccess` to invalidate the relevant queries. Don't write manual `refresh()` callbacks.

### Auth config

`BETTER_AUTH_SECRET` is required. `SIGNUP_MODE` is also required and must be `allowlist` or `open`; when `SIGNUP_MODE=allowlist`, `ALLOWED_EMAILS` is required and matched case-insensitively. Optional Google OAuth uses `GOOGLE_CLIENT_ID` plus `GOOGLE_CLIENT_SECRET`.

## Acceptance Tests

Behavioral specs in `tests/acceptance/` describe every user-facing feature. They are the source of truth for what the app should do.

### Running

Start the dev server (`pnpm run dev`), then walk each spec with `playwright-cli`:

```bash
playwright-cli open http://localhost:5173
# follow the steps in each spec
playwright-cli close
```

Cmd+K in headless Chrome requires a synthetic event:
```bash
playwright-cli run-code "async page => { await page.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', {key:'k',ctrlKey:true,bubbles:true})); }); }"
```

### Keeping specs current

When adding or modifying a user-facing feature, update the corresponding spec. If the feature is new and doesn't fit an existing spec, create a new numbered markdown file following the pattern.

Specs describe user-visible behavior, not implementation details. They should be framework-agnostic so they survive rewrites.

### Existing specs

- `01-home-page.md` — search, tag filtering, create note, stats
- `02-editor-modes.md` — rich text, markdown, split view, mode switching
- `03-sidebar.md` — note list, folders, collapse/expand, home
- `04-command-palette.md` — Cmd+K, actions, note search, create with title
- `05-note-operations.md` — auto-save, delete/undo, pin, folder, duplicate, clear tasks
- `06-rich-text-features.md` — floating toolbar, checklists, tab indent, smart typography, links, URL chips, wiki links, tables
- `07-settings-and-theme.md` — theme, accent color, settings persistence
- `08-focus-mode.md` — enter/exit, editor works in focus
- `09-trash.md` — view, restore, permanent delete
- `10-version-history.md` — browse, preview, restore
- `11-daily-note.md` — Cmd+Shift+D opens today's note (creating if missing)
- `12-auth.md` — sign up / in / out, auth gate, session persistence, cross-user isolation

## Commits

Use conventional commit syntax. Format: `<type>(<optional scope>): <description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

## Testing

Run `pnpm test` before committing.

## Agent Workflow

- Always use Hunk when reviewing changes. Before marking work complete, inspect the diff in Hunk and use it as the default review surface for code changes.
- Annotate more aggressively while working: call out important discoveries, tradeoffs, and non-obvious implementation choices instead of only reporting final outcomes.
- Add concise code comments for non-obvious behavior, edge cases, and cross-file contracts. Avoid restating what the code already says.

### QA user (browser/playwright walkthroughs)

A dev-only QA user (`qa@inkling.local`) lives in the local D1, created
via direct insert (bypasses `ALLOWED_EMAILS`). Credentials are in `.env`
(gitignored, loaded by mise) as `QA_EMAIL` / `QA_PASSWORD`. Use it for
automated QA via curl/playwright instead of touching the real account.

If local D1 gets wiped: `node scripts/create-qa-user.mjs` recreates the
user using whatever `QA_EMAIL` / `QA_PASSWORD` are currently in `.env`.

## Formatting & Linting

- `pnpm run fmt` — oxfmt
- `pnpm run lint` — oxlint

# Cloudflare

You have access to local Cloudflare services (KV, R2, D1, Durable Objects, and Workflows) for this app via the Explorer API.
API endpoint: http://localhost:5173/cdn-cgi/explorer/api.

Fetch the OpenAPI schema from http://localhost:5173/cdn-cgi/explorer/api to discover available operations. Use these endpoints to list, query, and manage local resources during development.
