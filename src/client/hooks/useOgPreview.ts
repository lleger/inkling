import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { ogPreviewQuery, queryKeys } from "../lib/queries";
import { fetchOgPreview } from "../lib/api";

export function useOgPreview(url: string) {
  const qc = useQueryClient();
  const q = useQuery(ogPreviewQuery(url));

  // Force a fresh fetch (bypasses both the worker's Cache API and the
  // TanStack Query cache). Used by the chip's refresh button.
  const refresh = useCallback(async () => {
    if (!url) return;
    const fresh = await fetchOgPreview(url, { refresh: true });
    qc.setQueryData(queryKeys.ogPreview(url), fresh);
  }, [qc, url]);

  return {
    preview: q.data,
    isLoading: q.isLoading,
    error: q.error as Error | null,
    refresh,
  };
}
