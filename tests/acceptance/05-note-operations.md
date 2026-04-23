# Note Operations

## Auto-Save
- Open a note and type some text
- Wait ~2 seconds — the save indicator dot in the sidebar should pulse then disappear
- Refresh the page — the typed text should still be there

## Delete and Undo
- Hover a note in the sidebar, click the X delete button
- A toast should appear: "Note title" moved to Trash" with an Undo button
- Click Undo — the note should reappear in the sidebar and open in the editor

## Pin/Unpin
- Open Cmd+K, select "Pin note"
- The note should move to the top of the sidebar with a pin icon
- Open Cmd+K again — should show "Unpin note"
- Select it — note returns to its normal position

## Move to Folder
- Open Cmd+K, select "Move to folder"
- A modal should appear with a search input
- Type a folder name and select "Create <name>"
- The note should now appear under that folder in the sidebar

## Duplicate Note
- Open Cmd+K, select "Duplicate note"
- A copy of the note should be created with "(copy)" in the title

## Clear Done Tasks
- Create a note with some `- [x]` and `- [ ]` items
- Open Cmd+K — "Clear N done tasks" should appear
- Select it — checked items should be removed, unchecked remain
