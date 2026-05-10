# Editor Modes

## Rich Text Mode (default)
- Open a note from the sidebar
- The editor should be in rich text mode (serif/sans font, WYSIWYG)
- Headings should render as large text, not as `# heading`
- Lists should show bullets, not `- ` prefix

## Markdown Mode
- Click the markdown mode icon (code icon) in the top-right mode switcher
- The editor should switch to monospace font
- Content should show raw markdown (e.g., `# Heading`, `- item`)
- Bold text should show as `**bold**` with visual highlighting

## Split Mode
- Click the split view icon in the mode switcher
- Two panes should appear side by side
- Left pane: editable markdown (monospace)
- Right pane: read-only rich text preview

## Mobile Split Mode
- Set viewport to a phone size such as 390x844
- Click the split view icon in the mode switcher
- Markdown editor and rich text preview should stack vertically
- Editor content should fit without horizontal page scrolling
- Mode controls should remain visible and tappable

## Mode Switching Preserves Content
- Type some text in rich text mode
- Switch to markdown mode
- The same content should appear in markdown format
- Switch back to rich text — content should be intact
