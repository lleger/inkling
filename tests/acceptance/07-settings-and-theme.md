# Settings and Theme

## Open Settings Page
- Click the gear icon in the sidebar footer
- The app should navigate to `/settings`
- The settings page should show Theme, Accent color, Default editor, Copy Markdown by default, Smart typography, Daily Notes, and Account sections

## Theme Toggle
- Select "Dark" in the theme switcher
- The app should switch to dark mode immediately
- Select "Light" — back to light mode
- Select "System" — should follow OS preference

## Accent Color
- Click a different color circle (e.g., purple)
- The accent color should change throughout the app (active states, links, checkboxes, etc.)

## Settings Persistence
- Change a setting, close and reopen the app
- The setting should persist (stored in D1)

## Copy Preference
- Toggle "Copy Markdown by default" on
- In rich text mode, Cmd+C should copy Markdown/plain-text source
- Toggle it off
- In rich text mode, Cmd+C should copy rich text, while Cmd+Ctrl+Shift+C still copies Markdown

## Sign Out
- The settings page should show the user email in the Account section

## Mobile Settings Page
- Set viewport to a phone size such as 390x844
- The settings page should fit inside the viewport with side margins
- The page should scroll normally if content is taller than the screen
- User email should truncate rather than overflow
