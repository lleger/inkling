import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { authClient, signIn, signUp } from "../lib/auth-client";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

type LoginMode = "signin" | "signup" | "forgot" | "magic";

export const Route = createFileRoute("/login")({
  validateSearch: (search): { mode?: LoginMode; redirect?: string } => ({
    mode:
      search.mode === "signup" || search.mode === "forgot" || search.mode === "magic"
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
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useDocumentTitle(
    mode === "signup"
      ? "Create account"
      : mode === "forgot"
        ? "Reset password"
        : mode === "magic"
          ? "Magic link"
          : "Sign in",
  );

  const redirectTo = search.redirect || "/";

  const resetForm = (nextMode: LoginMode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setPassword("");
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
      } else if (mode === "forgot") {
        await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        });
        setNotice("If that account exists, a reset link is on its way.");
      } else if (mode === "magic") {
        await signIn.magicLink({ email, callbackURL: redirectTo });
        setNotice("If that account exists, a sign-in link is on its way.");
      } else {
        const res = await signIn.email({ email, password, callbackURL: redirectTo });
        if (res.error) {
          const message = res.error.message || "Something went wrong";
          if (res.error.status === 403 || message.toLowerCase().includes("verified")) {
            throw new Error("Please verify your email first.");
          }
          throw new Error(message);
        }
        navigate({ to: redirectTo });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(
        message.toLowerCase().includes("verify") || message.toLowerCase().includes("verified")
          ? "Please verify your email first."
          : message,
      );
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  if (notice) {
    return (
      <div className="flex h-full items-center justify-center bg-surface px-6">
        <div className="w-full max-w-sm">
          <h1 className="mb-1 text-lg font-semibold text-text">Check your email</h1>
          <p className="mb-6 text-sm text-text-muted">
            {mode === "signup"
              ? "Open the verification link to finish creating your account."
              : mode === "forgot"
                ? "Open the reset link to choose a new password."
                : "Open the sign-in link within 5 minutes."}
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
        <h1 className="mb-1 text-lg font-semibold text-text">
          {mode === "signup"
            ? "Create account"
            : mode === "forgot"
              ? "Reset password"
              : mode === "magic"
                ? "Magic link"
                : "Sign in"}
        </h1>
        <p className="mb-6 text-sm text-text-muted">
          {mode === "signup"
            ? "Start writing after verifying your email."
            : mode === "forgot"
              ? "We'll send a password reset link."
              : mode === "magic"
                ? "We'll email you a short-lived sign-in link."
                : "Welcome back."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="w-full rounded-md border border-border bg-surface-secondary px-2.5 py-2 text-sm text-text placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          )}
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-md border border-border bg-surface-secondary px-2.5 py-2 text-sm text-text placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          {(mode === "signin" || mode === "signup") && (
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder={mode === "signin" ? "Your password" : "At least 8 characters"}
                className="w-full rounded-md border border-border bg-surface-secondary px-2.5 py-2 text-sm text-text placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
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
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy
              ? "..."
              : mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : mode === "magic"
                    ? "Send sign-in link"
                    : "Sign in"}
          </button>
        </form>

        {mode === "signin" && (
          <div className="mt-3 flex justify-between gap-3 text-[12px]">
            <button
              type="button"
              onClick={() => resetForm("forgot")}
              className="text-text-muted hover:text-text-secondary"
            >
              Forgot password?
            </button>
            <button
              type="button"
              onClick={() => resetForm("magic")}
              className="text-text-muted hover:text-text-secondary"
            >
              Email a sign-in link
            </button>
          </div>
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
