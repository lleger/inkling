import { useEffect, useState } from "react";
import { QRCode } from "react-qr-code";
import { Check, KeyRound, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useUI } from "../context/UIContext";
import { authClient, signOut } from "../lib/auth-client";
import { ACCENT_COLORS, ACCENT_NAMES } from "../lib/accent-colors";
import type { EditorMode, Settings } from "../types";
import { Dialog } from "./ui/Dialog";
import { Input } from "./ui/Input";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Switch } from "./ui/Switch";
import { Textarea } from "./ui/Textarea";

interface SettingsContentProps {
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
  userEmail: string | null;
  twoFactorEnabled: boolean;
}

type Passkey = {
  id: string;
  name?: string | null;
  createdAt?: string | Date;
  deviceType?: string;
  backedUp?: boolean;
};

export function SettingsContent({
  settings,
  onUpdateSettings,
  userEmail,
  twoFactorEnabled,
}: SettingsContentProps) {
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
  const themeOptions: { value: Settings["theme"]; label: string; icon: React.ReactNode }[] = [
    { value: "system", label: "System", icon: <Monitor size={14} /> },
    { value: "light", label: "Light", icon: <Sun size={14} /> },
    { value: "dark", label: "Dark", icon: <Moon size={14} /> },
  ];

  const modeOptions: { value: EditorMode; label: string }[] = [
    { value: "richtext", label: "Rich Text" },
    { value: "markdown", label: "Markdown" },
  ];
  const isTwoFactorEnabled = twoFactorEnabledOverride ?? twoFactorEnabled;

  const loadPasskeys = async () => {
    const res = await fetch("/api/auth/passkey/list-user-passkeys");
    if (!res.ok) return;
    setPasskeys(await res.json());
  };

  useEffect(() => {
    if (userEmail) void loadPasskeys();
  }, [userEmail]);

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

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface-secondary/70 p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-text">Appearance</h2>
          <p className="mt-1 text-[12px] text-text-muted">Tune the editor to fit your workspace.</p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-[12px] font-medium text-text-secondary">Theme</label>
            <SegmentedControl
              value={settings.theme}
              options={themeOptions}
              onValueChange={(theme) => onUpdateSettings({ theme })}
              aria-label="Theme"
            />
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-medium text-text-secondary">
              Accent color
            </label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_NAMES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onUpdateSettings({ accent: color })}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                  className="relative flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: ACCENT_COLORS[color].swatch }}
                >
                  {settings.accent === color && (
                    <Check size={14} className="text-white" strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-secondary/70 p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-text">Editor</h2>
          <p className="mt-1 text-[12px] text-text-muted">
            Choose how notes open, copy, and format while you write.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-[12px] font-medium text-text-secondary">
              Default editor
            </label>
            <SegmentedControl
              value={settings.defaultMode}
              options={modeOptions}
              onValueChange={(defaultMode) => onUpdateSettings({ defaultMode })}
              aria-label="Default editor"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface/60 p-3">
            <div>
              <label className="block text-[12px] font-medium text-text-secondary">
                Copy Markdown by default
              </label>
              <span className="text-[11px] text-text-muted">
                When off, Cmd+C copies rich text. Cmd+Ctrl+Shift+C always copies Markdown.
              </span>
            </div>
            <Switch
              checked={settings.copyMarkdownByDefault}
              onCheckedChange={(copyMarkdownByDefault) =>
                onUpdateSettings({ copyMarkdownByDefault })
              }
              aria-label="Copy Markdown by default"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface/60 p-3">
            <div>
              <label className="block text-[12px] font-medium text-text-secondary">
                Smart typography
              </label>
              <span className="text-[11px] text-text-muted">Curly quotes, em-dashes, ellipsis</span>
            </div>
            <Switch
              checked={settings.smartTypography}
              onCheckedChange={(smartTypography) => onUpdateSettings({ smartTypography })}
              aria-label="Smart typography"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-secondary/70 p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-text">Daily Notes</h2>
          <p className="mt-1 text-[12px] text-text-muted">
            Configure where daily notes live and what they start with.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-[12px] font-medium text-text-secondary">
              Daily note folder
            </label>
            <Input
              type="text"
              value={settings.dailyNoteFolder}
              onChange={(e) => onUpdateSettings({ dailyNoteFolder: e.target.value })}
              placeholder="Daily"
            />
            <span className="mt-1 block text-[11px] text-text-muted">
              Where Cmd+Shift+D notes are filed
            </span>
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-medium text-text-secondary">
              Daily note template
            </label>
            <Textarea
              value={settings.dailyNoteTemplate}
              onChange={(e) => onUpdateSettings({ dailyNoteTemplate: e.target.value })}
              rows={8}
              className="font-mono"
            />
            <span className="mt-1 block text-[11px] text-text-muted">
              Supports {"{{date}}"}, {"{{label}}"}, and {"{{weekday}}"}
            </span>
          </div>
        </div>
      </section>

      {userEmail && (
        <section className="rounded-2xl border border-border bg-surface-secondary/70 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-text">Account</h2>
            <p className="mt-1 truncate text-[12px] text-text-muted">Signed in as {userEmail}</p>
          </div>
          <div className="mb-5 rounded-xl bg-surface/60 p-3">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[12px] font-medium text-text-secondary">
                  Authenticator app 2FA
                </h3>
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
                  className="rounded-lg bg-accent px-3 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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

            {twoFactorMessage && (
              <p className="mt-3 text-[12px] text-text-muted">{twoFactorMessage}</p>
            )}
            {twoFactorError && <p className="mt-3 text-[12px] text-red-600">{twoFactorError}</p>}
          </div>

          <div className="mb-5 rounded-xl bg-surface/60 p-3">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[12px] font-medium text-text-secondary">Passkeys</h3>
                <p className="mt-1 text-[11px] text-text-muted">
                  Add a device passkey for passwordless sign-in. Passkeys are a sign-in method, not
                  a second factor.
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await signOut();
                window.location.href = "/login";
              }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
            >
              <LogOut size={13} /> Sign out
            </button>
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
                    className="w-full rounded-lg bg-accent px-3 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
      )}
    </div>
  );
}
