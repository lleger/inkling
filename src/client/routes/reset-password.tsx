import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search): { token?: string; error?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data?.user) {
      throw redirect({ to: "/" });
    }
  },
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/reset-password" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(
    search.error ? "This reset link is invalid or expired." : null,
  );
  const [busy, setBusy] = useState(false);

  useDocumentTitle("Reset password");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.token) return;
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await authClient.resetPassword({ token: search.token, newPassword: password });
      if (res.error) throw new Error(res.error.message);
      await navigate({ to: "/login", search: { mode: "signin" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
      setPassword("");
      setConfirmPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-semibold text-text">Reset password</h1>
        <p className="mb-6 text-sm text-text-muted">Choose a new password for your account.</p>

        {!search.token ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-600">
            This reset link is invalid or expired.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="new-password"
                className="block text-[12px] font-medium text-text-secondary mb-1"
              >
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-md border border-border bg-surface-secondary px-2.5 py-2 text-sm text-text placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-[12px] font-medium text-text-secondary mb-1"
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-md border border-border bg-surface-secondary px-2.5 py-2 text-sm text-text placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
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
              {busy ? "..." : "Reset password"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => navigate({ to: "/login", search: { mode: "signin" } })}
          className="mt-4 w-full text-[12px] text-text-muted hover:text-text-secondary"
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
