# Project Instructions

## Architecture

React 18 + TanStack Router + TanStack Query frontend, Hono API on Cloudflare Workers with D1 (SQLite).

- **Routes**: `src/client/routes/` — file-based, generated route tree at `src/client/routeTree.gen.ts`
  - `__root.tsx` — outermost suspense boundary
  - `_app.tsx` — main shell layout (sidebar, modals, command palette, toast)
  - `_app.index.tsx` — `/` (home)
  - `_app.notes.$id.tsx` — `/notes/:id` (editor)
  - `_app.notes.$id_.versions.tsx` — `/notes/:id/versions` (trailing `_` breaks out of parent layout)
  - `_app.trash.tsx` — `/trash`
- **Components**: `src/client/components/` — Lexical editor, sidebar, modals, etc.
- **Hooks**: `src/client/hooks/` — `useNotes`, `useUser`, `useSettings`, `useTheme`. Built on TanStack Query.
- **Queries**: `src/client/lib/queries.ts` — central query keys and `queryOptions` factories
- **UI Context**: `src/client/context/UIContext.tsx` — ephemeral UI state shared across routes (sidebar/focus/palette/settings/folder modal toggles, toast)
- **Backend**: `src/worker/` — Hono API, D1 queries, auth middleware
- **Shared types**: `src/shared/types.ts`
- **Pure lib**: `src/client/lib/` — framework-agnostic utilities

### Dev Setup

Single server: `npm run dev` (Vite + `@cloudflare/vite-plugin`). Runs frontend + worker + D1 in one process on port 5173.

### Data flow

All server data flows through TanStack Query. To force a refetch, invalidate the query key:

```ts
queryClient.invalidateQueries({ queryKey: queryKeys.notes });
```

When adding a new mutation, set `onSuccess` to invalidate the relevant queries. Don't write manual `refresh()` callbacks.

## Acceptance Tests

Behavioral specs in `tests/acceptance/` describe every user-facing feature. They are the source of truth for what the app should do.

### Running

Start the dev server (`npm run dev`), then walk each spec with `playwright-cli`:

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
- `06-rich-text-features.md` — floating toolbar, checklists, tab indent, smart typography, links, tables
- `07-settings-and-theme.md` — theme, accent color, settings persistence
- `08-focus-mode.md` — enter/exit, editor works in focus
- `09-trash.md` — view, restore, permanent delete
- `10-version-history.md` — browse, preview, restore
- `11-daily-note.md` — Cmd+Shift+D opens today's note (creating if missing)

## Commits

Use conventional commit syntax. Format: `<type>(<optional scope>): <description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

## Testing

Run `npm test` before committing.

## Formatting & Linting

- `npm run fmt` — oxfmt
- `npm run lint` — oxlint
