# Daily Note

## Open today's daily note via shortcut
- Press `Cmd+Shift+D` (Ctrl+Shift+D on Linux/Windows)
- The app should open today's daily note
- If no note exists for today, a new note is created with the title `YYYY-MM-DD` (today's date)
- The note is placed in the `Daily` folder by default (configurable in Settings)
- The active daily note shows a compact daily navigation control with the current date rendered relatively (e.g. `Today`)

## Open today's daily note via /today URL
- Navigate to `/today` (e.g., bookmark, type in URL bar)
- Same behavior: redirects to today's daily note, creating it if missing
- The URL after redirect is `/notes/:id` of the daily note (so refreshing stays put)

## Open from sidebar
- Click the calendar/today button in the sidebar header
- Same behavior as the shortcut
- Click the daily notes browser button in the sidebar header
- The app opens `/daily`

## Open via command palette
- Press `Cmd+K` to open the command palette
- Select "Open today's daily note"
- Same behavior as the shortcut
- Select "Browse daily notes"
- The app opens `/daily`

## Browse daily notes
- Navigate to `/daily`
- Daily notes from the configured daily note folder are shown grouped by month
- Notes with date titles render relative labels when applicable, e.g. `Today`, `Yesterday`, and `Tomorrow`
- Each entry also shows the stored `YYYY-MM-DD` title for clarity
- Selecting an entry opens that note

## Idempotent
- After the first invocation, today's note exists
- Pressing the shortcut again should navigate to the same note — not create a duplicate
- The match is by exact title (`YYYY-MM-DD`) and folder

## Previous and next days
- Open a daily note
- Click the previous-day control
- The previous daily note opens, creating it if missing
- When viewing a past daily note, click the next-day control
- The next daily note opens, creating it if missing, but only up to today
- When viewing today's daily note, there is no next-day control
- Existing daily notes are reused instead of duplicated

## Folder configuration
- The Settings modal has a "Daily note folder" field (default: `Daily`)
- Changing it makes the next daily note creation use the new folder
- Existing daily notes are not moved

## Template configuration
- The Settings modal has a "Daily note template" field
- New daily notes are created from the template
- Template placeholders include `{{date}}`, `{{label}}`, and `{{weekday}}`
- Existing daily notes are not modified when the template changes
