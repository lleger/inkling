# Inkling

A minimal, fast writing app on Cloudflare Workers. Dual-mode editor with rich text and raw markdown, stored on the edge via D1, multi-user with email/password auth (better-auth), explicit sign-up mode, and an optional email allowlist.

## Features

### Editor
- **Rich text mode** — WYSIWYG editing with system sans-serif, markdown shortcuts (type `# `, `- `, `**`, etc.)
- **Markdown mode** — monospace raw markdown with syntax highlighting (bold, italic, code, strikethrough markers visually formatted with dimmed delimiters)
- **Split view** — editable markdown on the left, live rich text preview on the right
- **Smart typography** — auto-converts `--` to em-dash, straight quotes to curly quotes, `...` to ellipsis (rich text mode, toggleable in settings)
- **Markdown shortcuts in mono mode** — `Cmd+B` bold, `Cmd+I` italic, `Cmd+K` link wrapping
- **List continuation** — pressing Enter on a list item continues the list (bullets, numbers, checkboxes)
- **Checklist support** — `- [ ]` / `- [x]` render as interactive checkboxes in rich text, clickable to toggle
- **Table support** — markdown tables render as formatted tables in rich text
- **Clickable links** — `Cmd+click` opens links in rich text mode
- **URL chips** — bare pasted or typed URLs can render as inline preview chips backed by cached Open Graph metadata
- **Wiki links and backlinks** — type `[[` to link another note; backlinks appear in note details
- **Typewriter scrolling** — cursor stays in the upper half of the viewport as you write
- **Auto-save** — 1.5s debounce after last keystroke, immediate flush on tab switch
- **Word count** — live word count with large note warning at 10K+ words
- **Task progress** — shows completed/total tasks when the note has checklists

### Interface
- **Command palette** — `Cmd+K` to search notes and execute actions from one place
- **Focus mode** — hides all chrome for distraction-free writing (`Cmd+Shift+F`)
- **No top bar** — writing surface dominates the screen
- **Collapsible sidebar** — note list with accent bar on active note, save indicator dot
- **Folders** — collapsible folder sections with persistent emoji or Lucide icons
- **Home page** — note cards grid with search, tag filtering, preview snippets, word count, task progress stats
- **Daily note** — `Cmd+Shift+D`, `/today`, or the command palette opens today's note, creating it in the configured folder if needed
- **Trash and version history** — soft-delete with restore/permanent delete, plus version browsing and restore
- **Markdown import** — import `.md`, `.markdown`, or `.txt` files from the command palette
- **Dark/light/system theme** — configurable in settings with system preference following
- **Accent colors** — 6 color themes (green, blue, purple, orange, rose, teal)
- **Settings modal** — theme, accent color, default editor mode, smart typography toggle, daily note folder, sign out
- **Keyboard shortcuts HUD** — `Cmd+/` to view all shortcuts

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd+K` | Command palette |
| `Cmd+Shift+N` | New note |
| `Cmd+Shift+D` | Open today's daily note |
| `Cmd+Shift+M` | Cycle editor mode |
| `Cmd+Shift+S` | Toggle sidebar |
| `Cmd+Shift+F` | Focus mode |
| `Cmd+/` | Shortcuts HUD |
| `Cmd+B` | Bold (markdown mode) |
| `Cmd+I` | Italic (markdown mode) |
| `Cmd+K` | Link (markdown mode) |

### Backend
- **Cloudflare Workers** — served from the edge, globally fast
- **D1 (SQLite)** — notes and settings stored per-user with full CRUD API
- **better-auth** — email/password auth with session cookies, explicit sign-up mode, optional allowlist, and optional Google OAuth config
- **Hono** — lightweight API framework
- **Search** — full-text search across note titles and content
- **Open Graph previews** — authenticated OG endpoint with SSRF guards and 24h cache

## Tech stack

- React 19 + Vite + Tailwind CSS v4
- Lexical editor framework
- Hono on Cloudflare Workers
- D1 (SQLite) for storage
- `@cloudflare/vite-plugin` for unified dev/build/deploy
- Lucide React for icons
- Vitest for testing, oxlint + oxfmt for linting/formatting

## Getting started

```bash
npm install
npm run db:migrate:local
npm run dev
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local dev server with Workers runtime + D1 |
| `npm run build` | Production build |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run check` | Run format check, lint, typecheck, and tests |
| `npm run typecheck` | Run TypeScript with `--noEmit` |
| `npm test` | Run all tests |
| `npm run lint` | Lint with oxlint |
| `npm run lint:fix` | Auto-fix lint issues where safe |
| `npm run fmt` | Format with oxfmt |
| `npm run db:generate` | Generate Drizzle migrations from `schema.ts` |
| `npm run db:migrate:local` | Apply D1 migrations locally |
| `npm run db:migrate` | Apply D1 migrations on production |

Schema source lives in `src/worker/db/schema.ts`. Apply migrations from `src/worker/db/migrations/`; `src/worker/db/migrate-*.sql` and `src/worker/db/schema.sql` are retained as legacy reference SQL.

## Deploy

1. Create a D1 database: `wrangler d1 create inkling-db`
2. Update `database_id` in `wrangler.jsonc`
3. Run migrations: `npm run db:migrate`
4. Set auth policy vars: `SIGNUP_MODE=open` or `SIGNUP_MODE=allowlist` with `ALLOWED_EMAILS` in `wrangler.jsonc` or as secrets/vars
5. Set required secret: `wrangler secret put BETTER_AUTH_SECRET`
6. Optionally configure Google OAuth with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
7. Deploy: `npm run deploy`

## Project structure

```
src/
  client/                  # React SPA
    components/            # Editor, Sidebar, HomePage, CommandPalette, etc.
    context/               # Ephemeral UI state shared across app routes
    hooks/                 # useNotes, useTheme, useSettings, useUser
    lib/                   # Markdown processing, typography, accent colors, API client
    routes/                # TanStack Router file routes and layouts
    types/                 # TypeScript types
  worker/                  # Cloudflare Worker API
    routes/                # Hono route handlers (notes, folders, user, settings, OG)
    middleware/            # better-auth session middleware
    db/                    # D1 schema, migrations, and queries
```
