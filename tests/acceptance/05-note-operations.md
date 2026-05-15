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

## Sidebar Context Menu
- Right-click a note in the sidebar
- A menu should appear with Open, Pin/Unpin, Move to folder, View versions, Duplicate, and Delete actions
- Select Pin or Unpin — the note should move between pinned and normal positions
- Select Move to folder — the move modal should open for that note
- Select View versions — the version history page should open for that note
- Select Duplicate — a copy of the note should be created and opened
- Right-click the note again and select Delete — the note should move to Trash with the same undo toast as the hover delete button

## Folder Context Menu
- Right-click a folder in the sidebar
- A menu should appear with Customize icon and Delete folder actions
- Select Customize icon — the folder icon picker should open for that folder
- Select Delete folder — every note in that folder and its nested folders should move to Trash, with an Undo toast to restore them

## Move to Folder
- Open Cmd+K, select "Move to folder"
- A modal should appear with a search input
- Daily and Scratch system folders should not appear as destination options, including a custom daily folder configured in Settings
- Type a folder name and select "Create <name>"
- The note should now appear under that folder in the sidebar

## Duplicate Note
- Open Cmd+K, select "Duplicate note"
- A copy of the note should be created with "(copy)" in the title

## Clear Done Tasks
- Create a note with some `- [x]` and `- [ ]` items
- Open Cmd+K — "Clear N done tasks" should appear
- Select it — checked items should be removed, unchecked remain
