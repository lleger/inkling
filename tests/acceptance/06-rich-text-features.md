# Rich Text Features

## Floating Toolbar
- Select text in rich text mode
- A floating toolbar should appear above the selection
- Buttons: Bold, Italic, Strikethrough, Code, Link | H1, H2, H3, Quote | Bullet, Numbered, Task list
- Click Bold — selected text should become bold
- Click again — bold should be removed

## Checklists
- Type `- [ ] ` at the start of a line
- It should convert to a checkbox
- Click the checkbox — it toggles checked/unchecked
- Checked items show strikethrough styling

## Tab Indentation
- In a bullet list, place cursor on an item and press Tab
- The item should nest under the previous item (indent)
- Press Shift+Tab — it should outdent back

## Smart Typography
- Type `--` — should convert to an em-dash (—)
- Type `"hello"` — quotes should become curly ("hello")
- Type `...` — should convert to an ellipsis (…)

## Clickable Links
- Create a link in the editor
- Cmd+click the link — it should open in a new tab

## URL Chips
- Paste or type a standalone `https://` URL in rich text mode
- It should convert to an inline URL chip showing fetched page metadata when available
- Backspace next to the chip should remove the whole chip
- Copying or switching modes should preserve the URL in markdown form

## Wiki Links And Backlinks
- Type `[[` in rich text mode
- A picker should appear with matching notes
- Selecting a note inserts an inline wiki-link chip that navigates to that note when clicked
- Opening the linked note's details panel should show the source note under Backlinks

## Tables
- In markdown mode, type a markdown table
- Switch to rich text mode — table should render with headers and borders

## Copy as Markdown
- In rich text mode, select a heading and copy (Cmd+C)
- Paste into a plain-text app — should be the markdown source (e.g. `# Heading`), not styled text
- Copying a paragraph with a link preserves `[text](url)` syntax
- Copying a list item preserves `- ` prefix

## Paste Markdown
- In rich text mode, paste markdown such as `# Heading` followed by `- item`
- The pasted content should render as rich text: heading text should become a heading and list markers should become list items
- Plain prose without markdown syntax should still paste as normal text
