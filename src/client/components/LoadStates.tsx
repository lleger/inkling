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
    <PageContainer aria-label={label} role="status">
      <span className="sr-only">{label}</span>
      <div className="space-y-3" aria-hidden="true">
        <div className="h-2 w-2/5 rounded-full bg-surface-tertiary animate-pulse" />
        <div className="h-2 w-4/5 rounded-full bg-surface-tertiary animate-pulse [animation-delay:120ms]" />
        <div className="h-2 w-3/5 rounded-full bg-surface-tertiary animate-pulse [animation-delay:240ms]" />
        <div className="h-2 w-full rounded-full bg-surface-tertiary animate-pulse [animation-delay:360ms]" />
        <div className="h-2 w-1/2 rounded-full bg-surface-tertiary animate-pulse [animation-delay:480ms]" />
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
