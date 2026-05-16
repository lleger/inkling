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
- Unverified account → inline "Please verify your email first. We sent a new verification link to your email." message and a verification email is sent

## Password Reset
- Navigate to `/login` and click "Forgot password?"
- Enter an email and submit
- Should see "If that account exists, a reset link is on its way."
- Open the reset link from the email
- Enter and confirm a new password (min 8 chars)
- Submit — should return to `/login`
- Sign in with the new password succeeds
- Existing sessions for that user are revoked
- The user receives a password-reset security notification
- If the account has passkeys but no authenticator-app 2FA, email-only password reset is refused with a high-risk recovery message instead of enabling password-only access
- If the account has authenticator-app 2FA enabled, password reset does not disable it; the next password sign-in still requires an authenticator code

## Two-Factor Authentication
- Sign in, open Settings, and find the Account section
- Enter the current password and click "Set up 2FA"
- A QR code, TOTP setup URI, and backup codes are shown
- Clicking "Copy codes" copies all backup codes to the clipboard
- Scan the QR code or add the setup URI to an authenticator app, enter the app code, and click "Verify and enable"
- The user receives a 2FA-enabled security notification
- Sign out, then sign in with email + password
- The login form switches to "Two-factor verification"
- Enter a valid authenticator app code and submit
- Should be signed in and redirected to `/` (or to the `redirect` query param if present)
- Invalid authenticator codes show an inline error and do not sign in
- "Use backup code" accepts a valid backup code instead of an authenticator code
- Disabling 2FA requires recent sign-in or authenticator step-up
- If no passkey is enrolled, disabling 2FA is refused with "Add a passkey before disabling authenticator app 2FA."
- With a passkey enrolled, entering the current password and clicking "Disable 2FA" turns 2FA off and sends a security notification

## Passkeys
- Sign in, open Settings, and find the Account section
- Enter a recognizable passkey label, such as "MacBook Touch ID"
- Click "Add passkey" in the Passkeys card
- If the session is not fresh, a Security verification modal requires an authenticator code before continuing
- Complete the browser passkey prompt
- The page shows "Passkey added. You can use it to sign in on this device."
- The passkey appears in the Passkeys list with the chosen label
- Clicking "Rename", entering a new label, and saving updates the passkey label without step-up
- The user receives a passkey-added security notification
- Sign out and return to `/login`
- Click "Sign in with passkey" and complete the browser passkey prompt
- Should be signed in and redirected to `/` (or to the `redirect` query param if present)
- Removing a passkey requires recent sign-in or authenticator step-up
- Removing the last passkey is refused unless authenticator-app 2FA remains enabled
- Removing a passkey sends a security notification
- Passkeys are passwordless sign-in credentials; they are not presented as a second factor

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
