# Scratch Note

## Open scratch via shortcut
- Press `Cmd+Shift+X` (Ctrl+Shift+X on Linux/Windows)
- The app should open the scratch note
- If no scratch note exists, a new note is created with the title `Scratch`
- The note is placed in the reserved `Scratch` folder

## Open scratch via /scratch URL
- Navigate to `/scratch` (e.g., bookmark, type in URL bar)
- Same behavior: redirects to the scratch note, creating it if missing
- The URL after redirect is `/notes/:id` of the scratch note

## Open from sidebar
- Click the Scratch row in the sidebar
- Same behavior as the shortcut
- The Scratch folder does not appear in the normal folder tree

## Open via command palette
- Press `Cmd+K` to open the command palette
- Select "Open scratch note"
- Same behavior as the shortcut

## Single note
- After the first invocation, the scratch note exists
- Opening scratch again should navigate to the same note, not create a duplicate
- The match is by the reserved `Scratch` folder, so changing the heading still keeps the same scratch note

## Daily reset
- Add content to the scratch note and let it save
- On the next local calendar day, open scratch again
- The same scratch note opens with the default blank scratch template
- The prior content is available through that note's Version History
