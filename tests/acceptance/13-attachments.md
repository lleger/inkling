# Attachments

## Upload Files
- Open a note
- Click the paperclip attachment button
- Choose an image and a non-image file
- Both files should upload and markdown references should appear in the note
- Wait for autosave, then refresh — the attachment references should still be present

## Rich Text Rendering
- Switch to rich text mode
- Image attachments should render inline in the note
- Non-image attachments should render as compact file cards
- Clicking an image or file card should open the authenticated attachment URL

## Drag, Drop, And Paste
- Drag a file onto the editor
- It should upload and append an attachment reference to the note
- Paste an image from the clipboard into the editor
- It should upload and append an image attachment reference

## Details Panel
- Open note details
- The Attachments section should list uploaded files with filename and size
- Click an attachment link — it should open/download the file
- Delete an attachment from the details panel
- The attachment should disappear from the details panel and its markdown reference should be removed from the note

## Removed References
- Upload a file and keep its markdown reference in the note
- Delete the markdown reference manually
- Wait for autosave
- Reopen note details — the removed attachment should no longer be listed

## Isolation
- Sign in as another user
- Attempting to open another user's attachment URL should return not found or unauthorized

## Trash
- Move a note with attachments to Trash
- Restore it — attachments should still work
- Permanently delete it — attachment URLs should no longer work
