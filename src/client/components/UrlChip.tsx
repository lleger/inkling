import { ExternalLink, RefreshCw, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { useOgPreview } from "../hooks/useOgPreview";

interface UrlChipProps {
  url: string;
  /**
   * Visual style:
   *   "inline" — single-line pill (favicon + title), used inside flowing
   *              prose. Default. Linear-style.
   *   "card"   — full preview card with image + description, block-level.
   *              Used in previews, version history, etc.
   */
  mode?: "inline" | "card";
}

export function UrlChip({ url, mode = "inline" }: UrlChipProps) {
  if (mode === "card") return <CardChip url={url} />;
  return <InlineChip url={url} />;
}

function InlineChip({ url }: { url: string }) {
  const { preview, isLoading, error } = useOgPreview(url);
  const display = (() => {
    if (preview?.title) return preview.title;
    if (isLoading) return prettyHost(url);
    if (error) return url;
    return prettyHost(url);
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-url-chip="inline"
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-surface-secondary px-1.5 py-0.5 align-baseline text-[0.95em] text-text no-underline transition-colors hover:border-accent/40 hover:text-accent"
    >
      {preview?.favicon ? (
        <img
          src={preview.favicon}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-3.5 w-3.5 flex-shrink-0"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <LinkIcon size={12} className={`flex-shrink-0 text-text-muted ${isLoading ? "animate-pulse" : ""}`} />
      )}
      <span className="truncate">{display}</span>
    </a>
  );
}

function CardChip({ url }: { url: string }) {
  const { preview, isLoading, error, refresh } = useOgPreview(url);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };

  if (isLoading) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="my-2 inline-flex max-w-2xl items-center gap-2 rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm text-text-muted no-underline"
      >
        <LinkIcon size={14} className="animate-pulse" />
        <span className="truncate">{prettyHost(url)}</span>
      </a>
    );
  }

  if (error || !preview) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="my-2 inline-flex max-w-2xl items-center gap-2 rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm text-text no-underline hover:border-accent/40"
      >
        <LinkIcon size={14} className="text-text-muted" />
        <span className="flex-1 truncate">{url}</span>
        <ExternalLink size={12} className="opacity-50" />
      </a>
    );
  }

  const host = prettyHost(preview.finalUrl ?? preview.url);
  return (
    <a
      href={preview.finalUrl || preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group my-2 flex max-w-2xl items-stretch overflow-hidden rounded-md border border-border bg-surface-secondary text-sm no-underline transition-colors hover:border-accent/40"
    >
      {preview.image && (
        <img
          src={preview.image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-auto w-24 flex-shrink-0 object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-0.5 p-3">
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          {preview.favicon && (
            <img
              src={preview.favicon}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-3 w-3 flex-shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <span className="truncate">{preview.siteName ?? host}</span>
        </div>
        {preview.title && (
          <div className="line-clamp-1 font-medium text-text">{preview.title}</div>
        )}
        {preview.description && (
          <div className="line-clamp-2 text-[12px] text-text-secondary">{preview.description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={handleRefresh}
        title="Refresh preview"
        className="flex-shrink-0 self-start p-2 text-text-muted opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
      >
        <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
      </button>
    </a>
  );
}

function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
