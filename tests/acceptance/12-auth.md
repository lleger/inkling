## Sign Up
- Navigate to `/login` and click "Don't have an account? Sign up"
- Fill in name, email, and a password (min 8 chars)
- Submit — should see "Check your email to verify your account."
- Open the verification link from the email
- The verification link signs the user in and redirects to `/` (or the original redirect target)
- Sidebar shows the user's email in the footer
- Note list is empty for a brand-new user (no leakage from other accounts)

## Sign In
- Navigate to `/login` (default mode is "Sign in")
- Enter existing email + password and submit
- Redirected to `/` (or to the `redirect` query param if present)
- Wrong password → an inline error appears, no redirect
- Unverified account → inline "Please verify your email first." message and a verification email is sent

## Password Reset
- Navigate to `/login` and click "Forgot password?"
- Enter an email and submit
- Should see "If that account exists, a reset link is on its way."
- Open the reset link from the email
- Enter and confirm a new password (min 8 chars)
- Submit — should return to `/login`
- Sign in with the new password succeeds
- Existing sessions for that user are revoked

## Magic Link
- Navigate to `/login` and click "Email a sign-in link"
- Enter an existing user's email and submit
- Should see "If that account exists, a sign-in link is on its way."
- Open the magic link within 5 minutes
- Should be signed in and redirected to `/` (or to the `redirect` query param if present)
- Magic links do not create new accounts for unknown emails
- Expired or reused magic links do not sign the user in

## Auth Gate
- Sign out (or open in a fresh browser)
- Navigate to `/`, `/notes/<id>`, `/trash`, `/today`, `/scratch`, or `/notes/<id>/versions`
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
- `SIGNUP_MODE` is required and must be `allowlist` or `open`
- When `SIGNUP_MODE=allowlist`, the `ALLOWED_EMAILS` env var (comma-separated) restricts who can sign up
- Allowlist matching is case-insensitive (`Logan@example.com` matches `logan@example.com`)
- When `SIGNUP_MODE=open`, signup is open to anyone and `ALLOWED_EMAILS` is not required
- Existing users can still sign in regardless of the allowlist (it only gates new accounts)

## Sign-Up Anti-Enumeration
- /api/auth/sign-up/email returns an identical 200 + empty body `{}` for every outcome:
  - Allowed + new email (verification email is sent)
  - Allowed + email already registered
  - Email not on the allowlist
- No sign-up response sets a session cookie before email verification
- The /login page always shows "Check your email to verify your account." after sign-up submission
