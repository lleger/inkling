import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { authClient, signIn, signUp } from "../lib/auth-client";
import { InklingWordmark } from "../components/Brand";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

type LoginMode = "signin" | "signup" | "forgot" | "twoFactor";

const EMAIL_VERIFICATION_MESSAGE =
  "Please verify your email first. We sent a new verification link to your email.";

export const Route = createFileRoute("/login")({
  validateSearch: (search): { mode?: LoginMode; redirect?: string } => ({
    mode:
      search.mode === "signup" || search.mode === "forgot" || search.mode === "twoFactor"
        ? search.mode
        : "signin",
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data?.user) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const [mode, setMode] = useState<LoginMode>(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const twoFactorRequiredRef = useRef(false);

  useEffect(() => {
    const handleTwoFactorRequired = () => {
      twoFactorRequiredRef.current = true;
      setMode("twoFactor");
      setPassword("");
      setBusy(false);
    };
    window.addEventListener("inkling:two-factor-required", handleTwoFactorRequired);
    return () => {
      window.removeEventListener("inkling:two-factor-required", handleTwoFactorRequired);
    };
  }, []);

  useDocumentTitle(
    mode === "signup"
      ? "Create account"
      : mode === "forgot"
        ? "Reset password"
        : mode === "twoFactor"
          ? "Two-factor verification"
          : "Sign in",
  );

  const redirectTo = search.redirect || "/";

  const resetForm = (nextMode: LoginMode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setPassword("");
    setShowPassword(false);
    setTwoFactorCode("");
    setUseBackupCode(false);
    setTrustDevice(false);
    setName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp.email({ email, password, name: name || email, callbackURL: redirectTo });
        setNotice("Check your email to verify your account.");
        setPassword("");
        setName("");
      } else if (mode === "twoFactor") {
        const res = useBackupCode
          ? await authClient.twoFactor.verifyBackupCode({ code: twoFactorCode, trustDevice })
          : await authClient.twoFactor.verifyTotp({ code: twoFactorCode, trustDevice });
        if (res.error) throw new Error(res.error.message || "Invalid verification code");
        navigate({ to: redirectTo });
      } else if (mode === "forgot") {
        await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        });
        setNotice("If that account exists, a reset link is on its way.");
      } else {
        const res = await signIn.email({ email, password });
        if (res.error) {
          const message = res.error.message || "Something went wrong";
          if (res.error.status === 403 || message.toLowerCase().includes("verified")) {
            throw new Error(EMAIL_VERIFICATION_MESSAGE);
          }
          throw new Error(message);
        }
        const data = res.data as { twoFactorRedirect?: boolean } | null;
        if (data?.twoFactorRedirect) {
          twoFactorRequiredRef.current = true;
          setMode("twoFactor");
          setPassword("");
          return;
        }
        if (twoFactorRequiredRef.current) return;
        navigate({ to: redirectTo });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(
        mode !== "twoFactor" &&
          (message.toLowerCase().includes("verify") || message.toLowerCase().includes("verified"))
          ? EMAIL_VERIFICATION_MESSAGE
          : message,
      );
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await signIn.passkey();
      if (res.error) throw new Error(res.error.message || "Could not sign in with passkey");
      navigate({ to: redirectTo });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in with passkey");
    } finally {
      setBusy(false);
    }
  };

  if (notice) {
    return (
      <div className="flex h-full items-center justify-center bg-surface px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center text-text">
            <InklingWordmark size={32} />
          </div>
          <h1 className="mb-1 text-lg font-semibold text-text">Check your email</h1>
          <p className="mb-6 text-sm text-text-muted">
            {mode === "signup"
              ? "Open the verification link to finish creating your account."
              : mode === "forgot"
                ? "Open the reset link to choose a new password."
                : "Open the link in your email."}
          </p>

          <div className="rounded-md border border-border bg-surface-secondary px-3 py-2 text-[12px] text-text-secondary">
            {notice}
          </div>

          <button
            type="button"
            onClick={() => resetForm("signin")}
            className="mt-4 w-full text-[12px] text-text-muted hover:text-text-secondary"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center text-text">
          <InklingWordmark size={32} />
        </div>
        <h1 className="mb-1 text-lg font-semibold text-text">
          {mode === "signup"
            ? "Create account"
            : mode === "forgot"
              ? "Reset password"
              : mode === "twoFactor"
                ? "Two-factor verification"
                : "Sign in"}
        </h1>
        <p className="mb-6 text-sm text-text-muted">
          {mode === "signup"
            ? "Start writing after verifying your email."
            : mode === "forgot"
              ? "We'll send a password reset link."
              : mode === "twoFactor"
                ? "Enter your authenticator app code or a backup code."
                : "Welcome back."}
        </p>

        {mode === "signin" && (
          <>
            <button
              type="button"
              onClick={handlePasskeySignIn}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface-secondary px-3 py-2.5 text-sm font-medium text-text-secondary shadow-sm transition-colors hover:bg-surface-hover hover:text-text disabled:opacity-50"
            >
              <KeyRound size={16} /> Sign in with passkey
            </button>
            <div className="my-4 flex items-center gap-3 text-[11px] text-text-muted">
              <div className="h-px flex-1 bg-border" />
              <span>or sign in with password</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label
                htmlFor="auth-name"
                className="block text-[12px] font-medium text-text-secondary mb-1"
              >
                Name
              </label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="w-full rounded-md border border-border bg-surface-secondary px-2.5 py-2 text-sm text-text placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          )}
          {mode !== "twoFactor" && (
            <div>
              <label
                htmlFor="auth-email"
                className="block text-[12px] font-medium text-text-secondary mb-1"
              >
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-md border border-border bg-surface-secondary px-2.5 py-2 text-sm text-text placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          )}
          {(mode === "signin" || mode === "signup") && (
            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label
                  htmlFor="auth-password"
                  className="text-[12px] font-medium text-text-secondary"
                >
                  Password
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => resetForm("forgot")}
                    className="text-[12px] text-text-muted hover:text-text-secondary"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder={mode === "signin" ? "Your password" : "At least 8 characters"}
                  className="w-full rounded-md border border-border bg-surface-secondary px-2.5 py-2 pr-14 text-sm text-text placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-text-muted hover:text-text-secondary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}
          {mode === "twoFactor" && (
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1">
                {useBackupCode ? "Backup code" : "Authenticator code"}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                required
                autoComplete="one-time-code"
                placeholder={useBackupCode ? "Backup code" : "123456"}
                className="w-full rounded-md border border-border bg-surface-secondary px-2.5 py-2 text-sm text-text placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <label className="mt-2 flex items-center gap-2 text-[12px] text-text-muted">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                />
                Trust this device for 30 days
              </label>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-600">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy
              ? "..."
              : mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : mode === "twoFactor"
                    ? "Verify"
                    : "Sign in"}
          </button>
        </form>

        {mode === "twoFactor" && (
          <button
            type="button"
            onClick={() => {
              setUseBackupCode((value) => !value);
              setTwoFactorCode("");
              setError(null);
            }}
            className="mt-3 text-[12px] text-text-muted hover:text-text-secondary"
          >
            {useBackupCode ? "Use authenticator code" : "Use backup code"}
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            resetForm(mode === "signin" ? "signup" : "signin");
          }}
          className="mt-4 w-full text-[12px] text-text-muted hover:text-text-secondary"
        >
          {mode === "signin" ? "Don't have an account? Sign up" : "Back to sign in"}
        </button>
      </div>
    </div>
  );
}
