# Security

Inkling uses a passkey-first authentication posture. Passwords remain available for compatibility, but the preferred path is phishing-resistant WebAuthn/FIDO2 passkeys.

## Authentication Posture

- Passkeys are the primary sign-in method.
- Password sign-in is treated as fallback infrastructure.
- Authenticator-app TOTP is supported for password sign-in MFA and sensitive account step-up.
- Email is used for verification and password reset delivery, not as a primary authenticator.
- Magic-link primary authentication is intentionally not supported.

## Sign-In Methods

### Passkeys

Passkeys are implemented with Better Auth's passkey plugin and WebAuthn/FIDO2.

- Users can sign in with `Sign in with passkey` from the top of the login page.
- Users can enroll multiple passkeys in Settings -> Account -> Passkeys.
- Passkeys can be labeled and renamed so users can distinguish devices or password managers.
- Passkey labels are metadata only and do not require step-up to edit.
- Adding or removing passkeys is treated as sensitive and requires step-up.

### Email/Password + TOTP

Email/password sign-in remains supported.

- Email verification is required before password sign-in.
- If authenticator-app 2FA is enabled, password sign-in requires a TOTP code or backup code.
- Password reset revokes existing sessions using Better Auth's built-in `revokeSessionsOnPasswordReset` behavior.
- Password reset does not disable TOTP or remove passkeys.

## Step-Up Authentication

Step-up is required before sensitive credential-management actions.

Step-up is required for:

- Adding a passkey.
- Removing a passkey.
- Disabling authenticator-app 2FA.

Step-up is not required for:

- Renaming a passkey label.
- Signing out.
- Normal passkey sign-in.
- Normal password sign-in MFA.

### How Step-Up Is Stored

Step-up state is stored server-side in D1 using Better Auth's `verification` table.

- Identifier format: `step-up:<sessionId>`
- Value: user ID
- Expiry: 15 minutes
- Client storage: none

No step-up flag is stored in `localStorage` or `sessionStorage`. The browser only carries the normal Better Auth session cookie.

### How Step-Up Is Checked

The frontend calls `GET /api/security/step-up` to ask whether the current session has valid step-up state.

The server accepts step-up when:

- The current session has an unexpired `step-up:<sessionId>` record, or
- The account does not have TOTP enabled and the session is very fresh.

For TOTP-enabled accounts, the UI intentionally opens the Security verification modal instead of silently accepting a fresh sign-in. This keeps high-risk changes explicit.

### Sign-Out Behavior

Signing out does not currently delete the step-up row immediately. However, the row is keyed to the old session ID, and signing back in creates a new session ID. The old step-up record no longer matches and cannot satisfy step-up. It expires automatically after 15 minutes.

## Sensitive Operation Guards

Inkling wraps selected Better Auth endpoints before the generic `/api/auth/*` handler so app-specific security policy can be enforced while Better Auth still performs the credential operation.

Protected endpoints include:

- `/api/auth/passkey/generate-register-options`
- `/api/auth/passkey/verify-registration`
- `/api/auth/passkey/delete-passkey`
- `/api/auth/two-factor/disable`

The passkey rename endpoint is deliberately not step-up protected because labels are non-secret metadata.

## Non-Downgrade Rules

Inkling avoids silent security downgrades.

- TOTP cannot be disabled unless the account has at least one passkey.
- The last passkey cannot be removed unless TOTP remains enabled.
- Password reset is refused for passkey-protected accounts that do not have TOTP enabled. This prevents email-only password reset from converting a passkey-protected account into password-only access.
- Password reset for TOTP-enabled accounts preserves TOTP, so the next password sign-in still requires MFA.

## Recovery Codes

Better Auth's two-factor flow issues backup codes during TOTP setup.

- Codes are shown during setup and can be copied.
- Backup codes can be used during the login TOTP challenge.
- Recovery-code lifecycle management is intentionally minimal right now.

## Security Notifications

Inkling sends security notification emails for important account-security events:

- Password reset completed.
- Authenticator-app 2FA enabled.
- Authenticator-app 2FA disabled.
- Passkey added.
- Passkey removed.

These notifications are informational and are not used as proof of account ownership.

## Session Security

Sessions are managed by Better Auth.

- Session cookies are HTTP-only via Better Auth defaults.
- Cookies use `sameSite: "lax"`.
- Cookies are marked secure on HTTPS origins.
- Password reset revokes existing sessions.

## Rate Limiting And Password Hashing

Inkling relies on Better Auth defaults and plugin behavior for baseline rate limiting and password hashing unless explicitly configured otherwise.

Known follow-up:

- Confirm production Better Auth rate-limit storage is appropriate for the Cloudflare Workers/D1 deployment.
- Confirm the active Better Auth password hasher and parameters. If Better Auth defaults are not Argon2id in this environment, configure Argon2id explicitly.

## Known Risks And Mitigations

### Email Account Compromise

Risk: an attacker with mailbox access can request password reset links.

Mitigations:

- Password reset revokes sessions but does not remove TOTP or passkeys.
- Passkey-protected accounts without TOTP cannot be downgraded via email-only reset.
- TOTP-enabled accounts must still satisfy TOTP after password reset.

### Lost Passkeys And No TOTP

Risk: a passkey-only user who loses every passkey may be unable to recover automatically.

Mitigation:

- Email-only reset is intentionally refused for this state to avoid account takeover via mailbox compromise.
- Users should enroll multiple passkeys/devices.
- Future high-risk recovery should include support review, delay, and strong notification.

### Step-Up Rows Persist After Sign-Out

Risk: stale step-up rows remain in D1 until expiry.

Mitigation:

- Step-up rows are bound to session ID and user ID.
- Signed-out sessions cannot use the old row.
- Rows expire after 15 minutes.

Potential improvement:

- Delete `step-up:<sessionId>` during sign-out.

### No Dedicated Session Management UI Yet

Risk: users cannot currently inspect and revoke individual active sessions from Settings.

Mitigation:

- Better Auth has built-in session-list/revocation endpoints available for future UI.
- Password reset revokes existing sessions.

### Minimal Recovery-Code Management

Risk: users cannot currently regenerate or manage recovery codes after initial TOTP setup.

Mitigation:

- Backup codes are available during initial TOTP setup and during sign-in.
- Future recovery-code regeneration should require step-up and send a security notification.

### No Audit Event Table

Risk: security events are not currently recorded in a durable first-party audit table.

Mitigation:

- Security notification emails are sent for key events.
- Better Auth persists core auth state.
- Future work can add a `security_events` table if product requirements need account history or anomaly detection.

## QA Checklist

- Passkey sign-in is the first login option.
- Password sign-in remains available below the passkey option.
- Password sign-in for TOTP-enabled accounts requires TOTP.
- Adding a passkey opens the Security verification modal when step-up is not already active.
- Removing a passkey opens the Security verification modal when step-up is not already active.
- Disabling TOTP opens the Security verification modal when step-up is not already active.
- Renaming a passkey does not open the Security verification modal and shows a toast.
- Step-up remains valid across refresh for 15 minutes.
- Step-up does not carry across sign-out/sign-in because the session ID changes.
- The last passkey cannot be removed unless TOTP remains enabled.
- TOTP cannot be disabled unless a passkey exists.
- Password reset revokes sessions and preserves existing MFA/passkeys.
