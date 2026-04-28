import { useEffect } from "react";

const APP_NAME = "Inkling";
const DEFAULT_TITLE = APP_NAME;

/**
 * Sets `document.title` to `<title> — Inkling` while the calling component
 * is mounted, then reverts to `Inkling` on unmount. Pass `null` or omit to
 * leave the bare app name.
 *
 * Empty / whitespace strings collapse to the bare app name (useful for
 * "Untitled" notes where we don't want to render a leading em dash).
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    const trimmed = title?.trim();
    document.title = trimmed ? `${trimmed} — ${APP_NAME}` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
