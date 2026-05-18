# Table of contents

## Setup

Sign in as the QA user and create a note with several markdown headings, including duplicate names:

```markdown
# Project Plan

## Goals

Text.

## Details

Long enough content to require scrolling.

### Risks

More text.

## Details

Duplicate heading text.
```

## Desktop outline drawer

1. Open the note in rich text mode on a desktop-width viewport.
2. Verify an Outline button appears in the editor statusline.
3. Click the Outline button.
4. Verify a right-side outline drawer slides in and lists `Project Plan`, `Goals`, `Details`, `Risks`, and the second `Details`.
5. Click `Risks` in the drawer.
6. Verify the editor scrolls to the `Risks` heading and the drawer closes.
7. Reopen the outline drawer and click the second `Details` entry.
8. Verify the editor scrolls to the second `Details` heading, not the first one.

## Markdown mode

1. Switch to markdown mode.
2. Verify the Outline button remains visible on desktop.
3. Open the outline drawer and click `Goals`.
4. Verify the markdown editor scrolls to the `## Goals` line.

## Split and focus modes

1. Switch to split view.
2. Verify the Outline button is hidden.
3. Return to rich text mode and enter focus mode.
4. Verify the Outline button is hidden while focus mode is active.

## Mobile outline sheet

1. Resize to a mobile-width viewport.
2. Verify an Outline button appears in the editor statusline when the note has headings.
3. Tap the Outline button.
4. Verify a bottom sheet opens with the same heading list.
5. Tap `Risks`.
6. Verify the sheet closes and the editor scrolls to the `Risks` heading.
