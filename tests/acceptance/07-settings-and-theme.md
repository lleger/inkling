# Settings and Theme

## Open Settings Page
- Open the account menu in the sidebar footer and click Settings
- The app should navigate to `/settings/workspace`
- The settings page should show Workspace, Daily Notes, and Security tabs
- The Workspace tab should show Theme, Accent color, Default editor, Copy Markdown by default, and Smart typography settings
- Click the Daily Notes tab
- The app should navigate to `/settings/daily`
- It should show the daily note folder and template settings
- Click the Security tab
- The app should navigate to `/settings/security`
- It should show the signed-in user email plus email change, password change, 2FA, and passkey settings

## Theme Toggle
- Select "Dark" in the theme switcher
- The app should switch to dark mode immediately
- Select "Light" — back to light mode
- Select "System" — should follow OS preference

## Accent Color
- Click a different color circle (e.g., purple or yellow)
- The accent color should change throughout the app (active states, links, checkboxes, etc.)

## Settings Persistence
- Change a setting, close and reopen the app
- The setting should persist (stored in D1)

## Copy Preference
- Toggle "Copy Markdown by default" on
- In rich text mode, Cmd+C should copy Markdown/plain-text source
- Toggle it off
- In rich text mode, Cmd+C should copy rich text, while Cmd+Ctrl+Shift+C still copies Markdown

## Security
- The settings Security tab should show the user email
- Changing email should require security verification and send a confirmation link to the current email
- Opening the current-email confirmation link should return to Settings with a message to check the new email address
- Opening the new-email verification link should return to Settings with an "Email address changed" message
- Changing password should require the current password and security verification
- Sign out should be available from the sidebar account footer, not inside settings

## Mobile Settings Page
- Set viewport to a phone size such as 390x844
- The settings page should fit inside the viewport with side margins
- The page should scroll normally if content is taller than the screen
- User email should truncate rather than overflow
