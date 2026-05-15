import type { ErrorComponentProps } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { PageContainer } from "./PageContainer";

interface QueryErrorStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onRetry?: () => void;
}

export function QueryErrorState({
  title = "Something went wrong",
  message = "Try again in a moment.",
  actionLabel = "Retry",
  onRetry,
}: QueryErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-10 text-center">
      <AlertTriangle size={28} className="text-red-500" />
      <div>
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="mt-1 text-sm text-text-muted">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-secondary px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:border-accent/40 hover:text-accent"
        >
          <RefreshCw size={13} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function PageLoading({ label = "Loading..." }: { label?: string }) {
  return (
    <PageContainer className="items-center">
      <div
        className="w-full max-w-xl rounded-2xl border border-border bg-surface-secondary/50 p-4 shadow-sm sm:p-5"
        aria-label={label}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl border border-border bg-surface">
              <div className="size-2 rounded-full bg-accent animate-pulse" />
            </div>
            <div>
              <p className="text-base font-medium text-text sm:text-sm">{label}</p>
              <p className="text-base text-text-muted sm:text-xs">Preparing your workspace</p>
            </div>
          </div>
          <div className="hidden rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-muted sm:block">
            Inkling
          </div>
        </div>

        <div className="space-y-3" aria-hidden="true">
          <div className="h-3 w-2/3 rounded-full bg-surface-tertiary animate-pulse" />
          <div className="h-3 w-full rounded-full bg-surface-tertiary animate-pulse [animation-delay:120ms]" />
          <div className="h-3 w-5/6 rounded-full bg-surface-tertiary animate-pulse [animation-delay:240ms]" />
          <div className="grid gap-3 pt-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="mb-3 h-2.5 w-16 rounded-full bg-surface-tertiary animate-pulse" />
              <div className="space-y-2">
                <div className="h-2.5 w-full rounded-full bg-surface-tertiary animate-pulse [animation-delay:160ms]" />
                <div className="h-2.5 w-3/4 rounded-full bg-surface-tertiary animate-pulse [animation-delay:260ms]" />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="mb-3 h-2.5 w-20 rounded-full bg-surface-tertiary animate-pulse [animation-delay:80ms]" />
              <div className="space-y-2">
                <div className="h-2.5 w-5/6 rounded-full bg-surface-tertiary animate-pulse [animation-delay:220ms]" />
                <div className="h-2.5 w-1/2 rounded-full bg-surface-tertiary animate-pulse [animation-delay:320ms]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export function PageError({
  title = "Unable to load this page",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <PageContainer>
      <QueryErrorState title={title} message={message} onRetry={onRetry} />
    </PageContainer>
  );
}

export function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <PageError
      title="Unable to load this page"
      message={error instanceof Error ? error.message : "Try again in a moment."}
      onRetry={reset}
    />
  );
}
