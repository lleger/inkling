# Writer

A minimal, fast writing app on Cloudflare Workers. Dual-mode editor with rich text and raw markdown, stored on the edge via D1, secured with CF Zero Trust.

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
- **Typewriter scrolling** — cursor stays in the upper half of the viewport as you write
- **Auto-save** — 1.5s debounce after last keystroke, immediate flush on tab switch
- **Word count** — live word count with large note warning at 10K+ words
- **Task progress** — shows completed/total tasks when the note has checklists

### Interface
- **Command palette** — `Cmd+K` to search notes and execute actions from one place
- **Focus mode** — hides all chrome for distraction-free writing (`Cmd+Shift+F`)
- **No top bar** — writing surface dominates the screen
- **Collapsible sidebar** — note list with accent bar on active note, save indicator dot
- **Home page** — note cards grid with search, preview snippets, word count, task progress stats
- **Dark/light/system theme** — configurable in settings with system preference following
- **Accent colors** — 6 color themes (green, blue, purple, orange, rose, teal)
- **Settings modal** — theme, accent color, default editor mode, smart typography toggle
- **Keyboard shortcuts HUD** — `Cmd+/` to view all shortcuts

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd+K` | Command palette |
| `Cmd+Shift+N` | New note |
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
- **CF Zero Trust** — authentication via Access JWT, user identity from claims
- **Hono** — lightweight API framework
- **Search** — full-text search across note titles and content

## Tech stack

- React 19 + Vite + Tailwind CSS v4
- Lexical editor framework
- Hono on Cloudflare Workers
- D1 (SQLite) for storage
- `@cloudflare/vite-plugin` for unified dev/build/deploy
- Lucide React for icons
- Vitest for testing (125 tests), oxlint + oxfmt for linting/formatting

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
| `npm test` | Run all tests |
| `npm run lint` | Lint with oxlint |
| `npm run fmt` | Format with oxfmt |
| `npm run db:migrate:local` | Run D1 migrations locally |
| `npm run db:migrate` | Run D1 migrations on production |

## Deploy

1. Create a D1 database: `wrangler d1 create writer-db`
2. Update `database_id` in `wrangler.jsonc`
3. Run migrations: `npm run db:migrate`
4. Configure a CF Access application in the Zero Trust dashboard for your domain
5. Deploy: `npm run deploy`

## Project structure

```
src/
  client/                  # React SPA
    components/            # Editor, Sidebar, HomePage, CommandPalette, etc.
    hooks/                 # useNotes, useTheme, useSettings, useUser
    lib/                   # Markdown processing, typography, accent colors, API client
    types/                 # TypeScript types
  worker/                  # Cloudflare Worker API
    routes/                # Hono route handlers (notes, user, settings)
    middleware/            # CF Access auth
    db/                    # D1 schema, migrations, and queries
```
