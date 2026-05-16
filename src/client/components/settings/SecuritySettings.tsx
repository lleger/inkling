import { useEffect, useRef, useState } from "react";
import { QRCode } from "react-qr-code";
import { KeyRound } from "lucide-react";
import { useUI } from "../../context/UIContext";
import { authClient } from "../../lib/auth-client";
import { Dialog } from "../ui/Dialog";
import { Input } from "../ui/Input";

interface SecuritySettingsProps {
  userEmail: string | null;
  twoFactorEnabled: boolean;
  emailChangeStatus?: "check-new-email" | "changed";
  emailChangeLinkError?: string;
}

type Passkey = {
  id: string;
  name?: string | null;
  createdAt?: string | Date;
  deviceType?: string;
  backedUp?: boolean;
};

async function readErrorMessage(res: Response, fallback: string) {
  const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
  return data?.error || data?.message || fallback;
}

export function SecuritySettings({
  userEmail,
  twoFactorEnabled,
  emailChangeStatus,
  emailChangeLinkError,
}: SecuritySettingsProps) {
  const { showToast } = useUI();
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [twoFactorEnabledOverride, setTwoFactorEnabledOverride] = useState<boolean | null>(null);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState<string | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [newPasskeyName, setNewPasskeyName] = useState("");
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(null);
  const [editingPasskeyName, setEditingPasskeyName] = useState("");
  const [stepUpCode, setStepUpCode] = useState("");
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [stepUpBusy, setStepUpBusy] = useState(false);
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [emailChange, setEmailChange] = useState("");
  const [emailChangeBusy, setEmailChangeBusy] = useState(false);
  const [emailChangeMessage, setEmailChangeMessage] = useState<string | null>(null);
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const shownEmailChangeToast = useRef<string | null>(null);
  const isTwoFactorEnabled = twoFactorEnabledOverride ?? twoFactorEnabled;

  const loadPasskeys = async () => {
    const res = await fetch("/api/auth/passkey/list-user-passkeys");
    if (!res.ok) return;
    setPasskeys(await res.json());
  };

  useEffect(() => {
    if (userEmail) void loadPasskeys();
  }, [userEmail]);

  useEffect(() => {
    const toastKey =
      emailChangeStatus || (emailChangeLinkError ? `error:${emailChangeLinkError}` : null);
    if (emailChangeStatus === "check-new-email") {
      setEmailChangeMessage(
        "Current email confirmed. Check the new address for the final verification link.",
      );
      setEmailChangeError(null);
      if (shownEmailChangeToast.current !== toastKey) {
        shownEmailChangeToast.current = toastKey;
        showToast({ message: "Current email confirmed. Check the new address to finish." });
      }
    } else if (emailChangeStatus === "changed") {
      setEmailChangeMessage("Email address changed.");
      setEmailChangeError(null);
      if (shownEmailChangeToast.current !== toastKey) {
        shownEmailChangeToast.current = toastKey;
        showToast({ message: "Email address changed." });
      }
    } else if (emailChangeLinkError) {
      setEmailChangeMessage(null);
      setEmailChangeError("The email change link could not be verified. Try starting again.");
      if (shownEmailChangeToast.current !== toastKey) {
        shownEmailChangeToast.current = toastKey;
        showToast({ message: "Email change link could not be verified." });
      }
    }
  }, [emailChangeStatus, emailChangeLinkError, showToast]);

  const ensureStepUp = async () => {
    setStepUpError(null);
    const current = await fetch("/api/security/step-up");
    const currentData = current.ok ? ((await current.json()) as { verified?: boolean }) : null;
    if (currentData?.verified) return true;

    if (!isTwoFactorEnabled) {
      const fresh = await fetch("/api/security/step-up/fresh-session", { method: "POST" });
      if (fresh.ok) return true;
    }

    setStepUpRequired(true);
    setStepUpError(
      isTwoFactorEnabled
        ? "Enter an authenticator code to continue."
        : "Sign out and sign back in, then retry this security change.",
    );
    return false;
  };

  const handleVerifyStepUp = async () => {
    setStepUpBusy(true);
    setStepUpError(null);
    try {
      const res = await fetch("/api/security/step-up/totp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: stepUpCode }),
      });
      if (!res.ok) throw new Error("Invalid authenticator code");
      setStepUpCode("");
      setStepUpRequired(false);
      showToast({ message: "Security verification complete. Retry your change." });
    } catch (err) {
      setStepUpError(err instanceof Error ? err.message : "Could not verify code");
    } finally {
      setStepUpBusy(false);
    }
  };

  const copyBackupCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join("\n"));
    setTwoFactorMessage("Backup codes copied.");
    setTwoFactorError(null);
  };

  const handleStartTwoFactor = async () => {
    setTwoFactorBusy(true);
    setTwoFactorMessage(null);
    setTwoFactorError(null);
    try {
      const res = await authClient.twoFactor.enable({
        password: twoFactorPassword,
        issuer: "Inkling",
      });
      if (res.error) throw new Error(res.error.message || "Could not start two-factor setup");
      setTotpUri(res.data.totpURI);
      setBackupCodes(res.data.backupCodes);
      setTwoFactorMessage("Scan the setup URI, then enter a code from your authenticator app.");
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : "Could not start two-factor setup");
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    setTwoFactorBusy(true);
    setTwoFactorMessage(null);
    setTwoFactorError(null);
    try {
      const res = await authClient.twoFactor.verifyTotp({ code: twoFactorCode });
      if (res.error) throw new Error(res.error.message || "Invalid authenticator code");
      setTwoFactorPassword("");
      setTwoFactorCode("");
      setTotpUri(null);
      setTwoFactorEnabledOverride(true);
      setTwoFactorMessage("Two-factor authentication is enabled.");
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : "Invalid authenticator code");
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    setTwoFactorBusy(true);
    setTwoFactorMessage(null);
    setTwoFactorError(null);
    try {
      if (!(await ensureStepUp())) return;
      const res = await authClient.twoFactor.disable({ password: disablePassword });
      if (res.error)
        throw new Error(res.error.message || "Could not disable two-factor authentication");
      setDisablePassword("");
      setBackupCodes([]);
      setTwoFactorEnabledOverride(false);
      setTwoFactorMessage("Two-factor authentication is disabled.");
    } catch (err) {
      setTwoFactorError(
        err instanceof Error ? err.message : "Could not disable two-factor authentication",
      );
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const handleAddPasskey = async () => {
    setPasskeyBusy(true);
    setPasskeyMessage(null);
    setPasskeyError(null);
    try {
      if (!(await ensureStepUp())) return;
      const name = newPasskeyName.trim() || "Inkling passkey";
      const res = await authClient.passkey.addPasskey({ name });
      if (res.error) throw new Error(res.error.message || "Could not add passkey");
      setNewPasskeyName("");
      setPasskeyMessage("Passkey added. You can use it to sign in on this device.");
      await loadPasskeys();
    } catch (err) {
      setPasskeyError(err instanceof Error ? err.message : "Could not add passkey");
    } finally {
      setPasskeyBusy(false);
    }
  };

  const handleRenamePasskey = async (id: string) => {
    const name = editingPasskeyName.trim();
    if (!name) {
      setPasskeyError("Passkey label is required.");
      return;
    }
    setPasskeyBusy(true);
    setPasskeyMessage(null);
    setPasskeyError(null);
    try {
      const res = await fetch("/api/auth/passkey/update-passkey", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, name }),
      });
      if (!res.ok) throw new Error("Could not rename passkey");
      setEditingPasskeyId(null);
      setEditingPasskeyName("");
      showToast({ message: "Passkey label updated" });
      await loadPasskeys();
    } catch (err) {
      setPasskeyError(err instanceof Error ? err.message : "Could not rename passkey");
    } finally {
      setPasskeyBusy(false);
    }
  };

  const handleRemovePasskey = async (id: string) => {
    setPasskeyBusy(true);
    setPasskeyMessage(null);
    setPasskeyError(null);
    try {
      if (!(await ensureStepUp())) return;
      const res = await fetch("/api/auth/passkey/delete-passkey", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Could not remove passkey");
      setPasskeyMessage("Passkey removed.");
      await loadPasskeys();
    } catch (err) {
      setPasskeyError(err instanceof Error ? err.message : "Could not remove passkey");
    } finally {
      setPasskeyBusy(false);
    }
  };

  const handleChangeEmail = async () => {
    const nextEmail = emailChange.trim();
    if (!nextEmail) {
      setEmailChangeError("Enter a new email address.");
      return;
    }
    setEmailChangeBusy(true);
    setEmailChangeMessage(null);
    setEmailChangeError(null);
    try {
      if (!(await ensureStepUp())) return;
      const res = await fetch("/api/security/change-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          newEmail: nextEmail,
          callbackURL: "/settings/security?emailChange=check-new-email",
        }),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res, "Could not start email change"));
      setEmailChange("");
      setEmailChangeMessage(
        "Check your current email to approve the change, then verify the new address.",
      );
    } catch (err) {
      setEmailChangeError(err instanceof Error ? err.message : "Could not start email change");
    } finally {
      setEmailChangeBusy(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMessage(null);
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordBusy(true);
    try {
      if (!(await ensureStepUp())) return;
      const res = await fetch("/api/security/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        }),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res, "Could not change password"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password changed. Other sessions were signed out.");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-surface-secondary/70 p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-text">Security</h2>
        <p className="mt-1 truncate text-[12px] text-text-muted">
          Manage sign-in methods and sensitive account changes for {userEmail}
        </p>
      </div>
      <div className="mb-5 min-w-0 rounded-xl bg-surface/60 p-3">
        <div className="mb-3">
          <h3 className="text-[12px] font-medium text-text-secondary">Email address</h3>
          <p className="mt-1 text-[11px] text-text-muted">
            Changing email requires step-up verification and confirmation from your current email.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="new-email"
            name="new-email"
            type="email"
            value={emailChange}
            onChange={(e) => setEmailChange(e.target.value)}
            placeholder="New email address"
            aria-label="New email address"
            autoComplete="email"
            className="min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={handleChangeEmail}
            disabled={emailChangeBusy || !emailChange.trim()}
            className="rounded-lg border border-border px-3 py-2 text-[12px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:opacity-50"
          >
            {emailChangeBusy ? "Sending..." : "Change email"}
          </button>
        </div>
        {emailChangeMessage && (
          <p className="mt-3 text-[12px] text-text-muted">{emailChangeMessage}</p>
        )}
        {emailChangeError && <p className="mt-3 text-[12px] text-red-600">{emailChangeError}</p>}
      </div>

      <div className="mb-5 min-w-0 rounded-xl bg-surface/60 p-3">
        <div className="mb-3">
          <h3 className="text-[12px] font-medium text-text-secondary">Password</h3>
          <p className="mt-1 text-[11px] text-text-muted">
            Use your current password and a recent security verification. Other sessions are signed
            out after the change.
          </p>
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-3">
          <Input
            id="current-password"
            name="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            aria-label="Current password"
            autoComplete="current-password"
            className="min-w-0"
          />
          <Input
            id="new-password"
            name="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            aria-label="New password"
            autoComplete="new-password"
            className="min-w-0"
          />
          <Input
            id="confirm-password"
            name="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            aria-label="Confirm password"
            autoComplete="new-password"
            className="min-w-0"
          />
        </div>
        <button
          type="button"
          onClick={handleChangePassword}
          disabled={passwordBusy || !currentPassword || !newPassword || !confirmPassword}
          className="mt-2 rounded-lg border border-border px-3 py-2 text-[12px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:opacity-50"
        >
          {passwordBusy ? "Changing..." : "Change password"}
        </button>
        {passwordMessage && <p className="mt-3 text-[12px] text-text-muted">{passwordMessage}</p>}
        {passwordError && <p className="mt-3 text-[12px] text-red-600">{passwordError}</p>}
      </div>

      <div className="mb-5 min-w-0 rounded-xl bg-surface/60 p-3">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[12px] font-medium text-text-secondary">Authenticator app 2FA</h3>
            <p className="mt-1 text-[11px] text-text-muted">
              {isTwoFactorEnabled
                ? "Enabled. Sign-ins require your password and an app code."
                : "Add a second factor using an authenticator app."}
            </p>
          </div>
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-muted">
            {isTwoFactorEnabled ? "On" : "Off"}
          </span>
        </div>

        {!isTwoFactorEnabled && !totpUri && (
          <div className="space-y-2">
            <Input
              type="password"
              value={twoFactorPassword}
              onChange={(e) => setTwoFactorPassword(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={handleStartTwoFactor}
              disabled={twoFactorBusy || !twoFactorPassword}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:opacity-50"
            >
              <KeyRound size={13} /> {twoFactorBusy ? "Starting..." : "Set up 2FA"}
            </button>
          </div>
        )}

        {totpUri && (
          <div className="space-y-3">
            <div className="inline-block rounded-xl border border-border bg-white p-3">
              <QRCode value={totpUri} size={192} aria-label="Authenticator app setup QR code" />
            </div>
            <div className="rounded-lg border border-border bg-surface-secondary p-3">
              <p className="mb-2 text-[11px] text-text-muted">
                Scan the QR code, or paste this setup URI into your authenticator app:
              </p>
              <code className="block break-all text-[11px] text-text-secondary">{totpUri}</code>
            </div>
            <Input
              type="text"
              inputMode="numeric"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              placeholder="Authenticator code"
              autoComplete="one-time-code"
            />
            <button
              type="button"
              onClick={handleVerifyTwoFactor}
              disabled={twoFactorBusy || !twoFactorCode}
              className="rounded-lg bg-accent px-3 py-2 text-[12px] font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {twoFactorBusy ? "Verifying..." : "Verify and enable"}
            </button>
            {backupCodes.length > 0 && (
              <div className="rounded-lg border border-border bg-surface-secondary p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-text-muted">
                    Save these backup codes before leaving this page:
                  </p>
                  <button
                    type="button"
                    onClick={copyBackupCodes}
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
                  >
                    Copy codes
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 font-mono text-[11px] text-text-secondary">
                  {backupCodes.map((code) => (
                    <span key={code}>{code}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isTwoFactorEnabled && (
          <div className="flex flex-wrap gap-2">
            <Input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              className="max-w-64"
            />
            <button
              type="button"
              onClick={handleDisableTwoFactor}
              disabled={twoFactorBusy || !disablePassword}
              className="rounded-lg border border-border px-3 py-2 text-[12px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:opacity-50"
            >
              {twoFactorBusy ? "Disabling..." : "Disable 2FA"}
            </button>
          </div>
        )}

        {twoFactorMessage && <p className="mt-3 text-[12px] text-text-muted">{twoFactorMessage}</p>}
        {twoFactorError && <p className="mt-3 text-[12px] text-red-600">{twoFactorError}</p>}
      </div>

      <div className="mb-5 min-w-0 rounded-xl bg-surface/60 p-3">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[12px] font-medium text-text-secondary">Passkeys</h3>
            <p className="mt-1 text-[11px] text-text-muted">
              Add a device passkey for passwordless sign-in. Passkeys are a sign-in method, not a
              second factor.
            </p>
          </div>
        </div>
        <Input
          type="text"
          value={newPasskeyName}
          onChange={(e) => setNewPasskeyName(e.target.value)}
          placeholder="Label, e.g. MacBook Touch ID"
          className="mb-2"
        />
        <button
          type="button"
          onClick={handleAddPasskey}
          disabled={passkeyBusy}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:opacity-50"
        >
          <KeyRound size={13} /> {passkeyBusy ? "Adding..." : "Add passkey"}
        </button>
        {passkeys.length > 0 && (
          <div className="mt-3 space-y-2">
            {passkeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-secondary px-3 py-2"
              >
                {editingPasskeyId === key.id ? (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <Input
                      type="text"
                      value={editingPasskeyName}
                      onChange={(e) => setEditingPasskeyName(e.target.value)}
                      className="min-w-40 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => void handleRenamePasskey(key.id)}
                      disabled={passkeyBusy || !editingPasskeyName.trim()}
                      className="rounded-md border border-border px-2 py-1 text-[11px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPasskeyId(null);
                        setEditingPasskeyName("");
                      }}
                      className="rounded-md border border-border px-2 py-1 text-[11px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] text-text-secondary">
                        {key.name || "Unnamed passkey"}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        {key.createdAt
                          ? `Added ${new Date(key.createdAt).toLocaleDateString()}`
                          : "Registered passkey"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPasskeyId(key.id);
                          setEditingPasskeyName(key.name || "");
                          setPasskeyError(null);
                        }}
                        disabled={passkeyBusy}
                        className="rounded-md border border-border px-2 py-1 text-[11px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:opacity-50"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemovePasskey(key.id)}
                        disabled={passkeyBusy}
                        className="rounded-md border border-border px-2 py-1 text-[11px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        {passkeyMessage && <p className="mt-3 text-[12px] text-text-muted">{passkeyMessage}</p>}
        {passkeyError && <p className="mt-3 text-[12px] text-red-600">{passkeyError}</p>}
      </div>

      <Dialog
        open={stepUpRequired}
        onOpenChange={(open) => {
          setStepUpRequired(open);
          if (!open) {
            setStepUpCode("");
            setStepUpError(null);
          }
        }}
        title="Security verification"
        description="Sensitive account changes require a recent sign-in or authenticator app code."
        placement="center"
        size="sm"
        contentClassName="p-5"
      >
        <div>
          <h3 className="text-sm font-semibold text-text">Security verification</h3>
          <p className="mt-1 text-[12px] leading-5 text-text-muted">
            Sensitive account changes require a recent sign-in or authenticator app code.
          </p>

          {isTwoFactorEnabled ? (
            <div className="mt-4 space-y-3">
              <Input
                type="text"
                inputMode="numeric"
                value={stepUpCode}
                onChange={(e) => setStepUpCode(e.target.value)}
                placeholder="Authenticator code"
                autoComplete="one-time-code"
              />
              <button
                type="button"
                onClick={handleVerifyStepUp}
                disabled={stepUpBusy || !stepUpCode}
                className="w-full rounded-lg bg-accent px-3 py-2 text-[12px] font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {stepUpBusy ? "Verifying..." : "Verify and continue"}
              </button>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-[12px] leading-5 text-text-muted">
              Sign out and sign back in, then retry this security change.
            </p>
          )}

          {stepUpError && <p className="mt-3 text-[12px] text-red-600">{stepUpError}</p>}
        </div>
      </Dialog>
    </section>
  );
}
