## Sign Up
- Navigate to `/login` and click "Don't have an account? Sign up"
- Fill in name, email, and a password (min 8 chars)
- Submit — should be signed in immediately and redirected to `/`
- Sidebar shows the user's email in the footer
- Note list is empty for a brand-new user (no leakage from other accounts)

## Sign In
- Navigate to `/login` (default mode is "Sign in")
- Enter existing email + password and submit
- Redirected to `/` (or to the `redirect` query param if present)
- Wrong password → an inline error appears, no redirect

## Auth Gate
- Sign out (or open in a fresh browser)
- Navigate to `/`, `/notes/<id>`, `/trash`, `/today`, or `/notes/<id>/versions`
- Should redirect to `/login?mode=signin&redirect=<original path>`
- After signing in, should land on the originally requested path

## Session Persistence
- Sign in
- Refresh the page — still signed in
- Close and reopen the browser tab — still signed in (session cookie lasts 7 days)

## Sign Out
- Open Settings (gear icon in sidebar footer)
- Click "Sign out" in the Account section
- Redirected to `/login`
- Hitting Back does not restore access — visiting `/` redirects to `/login`

## User Isolation
- Sign in as user A, create a note
- Sign out, sign in as user B
- B's sidebar does not show A's note
- The /api/notes endpoint scopes by session.userId on the server
