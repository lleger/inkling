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

## Email Allowlist
- The `ALLOWED_EMAILS` env var (comma-separated) restricts who can sign up
- Allowlist matching is case-insensitive (`Logan@example.com` matches `logan@example.com`)
- If `ALLOWED_EMAILS` is unset, signup is open to anyone
- Existing users can still sign in regardless of the allowlist (it only gates new accounts)

## Sign-Up Anti-Enumeration
- /api/auth/sign-up/email returns an identical 200 + body for every outcome:
  - Allowed + new email (auto-sign-in succeeds)
  - Allowed + email already registered
  - Email not on the allowlist
- The body is always: `{"message": "If your email is allowed, you can sign in."}`
- Only the legitimate success case sets a session cookie (unavoidable)
- The /login page checks `getSession()` after sign-up:
  - If signed in → navigate to redirect target
  - If not → show the generic message, switch the form to "sign in" mode
