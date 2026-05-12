# UI Audit

Reviewed with the `/ui` workflow. These are open-ended UI/UX enhancement ideas for Inkling, ranging from small polish to larger product improvements.

## Highest-Value Fixes

1. Make sidebar tag filters actually work.

   `Sidebar` renders tag chips, but `_app.tsx` currently passes `selectedTag={null}` and `onSelectTag={() => {}}`. Either wire this into global filtering or remove the sidebar chips. Current behavior looks interactive but does nothing.

2. Integrate or remove the Shortcuts HUD.

   `ShortcutsHud` exists but appears unused. It also lists shortcuts that are not implemented, like `Cmd+Shift+N`, `Cmd+Shift+M`, `Cmd+Shift+S`, `Cmd+Shift+F`, and `Cmd+/`. This is a strong discoverability opportunity: add it to the command palette and make listed shortcuts real.

3. Surface save state in the editor.

   The sidebar was receiving `saveStatus="saved"` permanently, while the note route had pending save/retry state internally. A subtle `Saving...` / `Unsaved` / `Saved` status near the bottom word count builds trust, especially because autosave is central.

4. Improve icon-only editor controls.

   The mode switcher is compact, but `Type`, `Code`, and `Columns2` are not self-explanatory. Consider a segmented control with visible labels on desktop, or a single `Rich Text` pill that opens mode options.

5. Replace native destructive confirms.

   Trash uses `window.confirm` for permanent deletion. A custom confirm modal would feel more consistent, allow clearer copy, and avoid browser-default jank.

## Bigger UX Ideas

1. Home as a writing dashboard.

   Current home is a flat search/cards grid. Add sections like `Pinned`, `Today`, `Recently edited`, and `Unfiled`. This would make the app feel more intentional than a note dump.

2. Sidebar search / quick filter.

   For users with many notes, the sidebar becomes scroll-heavy. A small collapsible search field inside the sidebar would complement the global command palette.

3. Editable note details panel.

   `MetaPanel` is currently read-only except version/backlinks. Make folder and tags editable there. It would become the natural place for organization tasks instead of hiding everything behind command palette actions.

4. Version history diff mode.

   `VersionHistoryView` previews old versions, but a `Show changes` diff would make restore decisions much safer. Also auto-select the latest version when opening so the preview area is not empty.

5. Daily notes timeline polish.

   The daily notes page is already useful. It could become more compelling with a calendar strip, streak/coverage indicator, or `missing days` affordance.

## Visual Polish

1. Slightly increase small text contrast.

   The app uses a lot of `text-[10px]`, `text-[11px]`, and muted text. It looks elegant, but some controls may feel too quiet, especially in dark mode.

2. Give interactive cards clearer affordances.

   Home note cards and daily rows are clean. Adding stronger selected/hover states, subtle preview metadata alignment, or pinned/folder badges would improve scannability.

3. Unify modal behavior.

   Command palette, folder modal, settings, and icon picker are close but not identical. A shared modal surface treatment could improve consistency, especially on mobile where bottom-sheet behavior might feel better.

4. Make focus mode feel special.

   Focus mode currently mostly hides chrome. Add optional typewriter scrolling, centered line highlighting, or a soft ambient background treatment to make it feel like a dedicated writing mode.

## Suggested First Pass

1. Wire sidebar tags or remove them.
2. Add real keyboard shortcuts and integrate the shortcuts HUD.
3. Add visible autosave state.
4. Improve editor mode control labels.
5. Replace permanent-delete `confirm` with an app modal.
