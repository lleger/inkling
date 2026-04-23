# Project Instructions

## Acceptance Test Specs

When adding or modifying a user-facing feature, update the corresponding acceptance test spec in `tests/acceptance/`. If the feature is new and doesn't fit an existing spec, create a new numbered markdown file following the existing pattern.

Specs describe user-visible behavior, not implementation details. They should be framework-agnostic so they survive rewrites.

Existing specs:
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

## Commits

Use conventional commit syntax. Format: `<type>(<optional scope>): <description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

## Testing

Run `npm test` before committing. Currently 148 tests across 13 files.

## Formatting & Linting

- `npm run fmt` — oxfmt
- `npm run lint` — oxlint
