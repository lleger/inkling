import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { authClient, signIn, signUp } from "../lib/auth-client";

export const Route = createFileRoute("/login")({
  validateSearch: (search): { mode?: "signin" | "signup"; redirect?: string } => ({
    mode: (search.mode as "signin" | "signup") || "signin",
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        // Server returns a generic response regardless of outcome
        // (allowlist gate, existing email, success). The only way to know
        // whether we're actually signed in is to check the session.
        await signUp.email({ email, password, name: name || email });
        const session = await authClient.getSession();
        if (session.data?.user) {
          navigate({ to: search.redirect || "/" });
        } else {
          // Don't reveal whether the email is taken or not on the allowlist
          setError("Something went wrong.");
        }
      } else {
        const res = await signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
        navigate({ to: search.redirect || "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-semibold text-text">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mb-6 text-sm text-text-muted">
          {mode === "signin" ? "Welcome back." : "Start writing."}
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
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1">Password</label>
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
            {busy ? "..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setMode((m) => (m === "signin" ? "signup" : "signin")); setError(null); }}
          className="mt-4 w-full text-[12px] text-text-muted hover:text-text-secondary"
        >
          {mode === "signin" ? "Don't have an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
