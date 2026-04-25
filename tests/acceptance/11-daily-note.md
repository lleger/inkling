# Daily Note

## Open today's daily note via shortcut
- Press `Cmd+Shift+D` (Ctrl+Shift+D on Linux/Windows)
- The app should open today's daily note
- If no note exists for today, a new note is created with the title `YYYY-MM-DD` (today's date)
- The note is placed in the `Daily` folder by default (configurable in Settings)

## Open today's daily note via /today URL
- Navigate to `/today` (e.g., bookmark, type in URL bar)
- Same behavior: redirects to today's daily note, creating it if missing
- The URL after redirect is `/notes/:id` of the daily note (so refreshing stays put)

## Open via command palette
- Press `Cmd+K` to open the command palette
- Select "Open today's daily note"
- Same behavior as the shortcut

## Idempotent
- After the first invocation, today's note exists
- Pressing the shortcut again should navigate to the same note — not create a duplicate
- The match is by exact title (`YYYY-MM-DD`) and folder

## Folder configuration
- The Settings modal has a "Daily note folder" field (default: `Daily`)
- Changing it makes the next daily note creation use the new folder
- Existing daily notes are not moved
