import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { History, RotateCcw, ArrowLeft } from "lucide-react";
import { restoreVersion } from "../lib/api";
import { versionQuery, versionsQuery } from "../lib/queries";
import { RichTextPreview } from "./RichTextPreview";
import { IconButton } from "./ui/IconButton";
import type { Note } from "../types";
import { PageContainer } from "./PageContainer";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

interface VersionHistoryViewProps {
  noteId: string;
  noteTitle: string;
  onClose: () => void;
  onRestore: (note: Note) => void;
}

export function VersionHistoryView({
  noteId,
  noteTitle,
  onClose,
  onRestore,
}: VersionHistoryViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: versions = [], isLoading } = useQuery(versionsQuery(noteId));
  const { data: preview } = useQuery(versionQuery(noteId, selectedId));
  const selectedVersion = versions.find((v) => v.id === selectedId);

  const restore = useMutation({
    mutationFn: (versionId: string) => restoreVersion(noteId, versionId),
    onSuccess: onRestore,
  });

  const handleSelect = useCallback((versionId: string) => {
    setSelectedId(versionId);
  }, []);

  const handleRestore = useCallback(async () => {
    if (!selectedId) return;
    await restore.mutateAsync(selectedId);
  }, [restore, selectedId]);

  return (
    <PageContainer maxWidth="max-w-[900px]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <IconButton
          buttonSize="md"
          onClick={onClose}
          title="Back to note"
          aria-label="Back to note"
        >
          <ArrowLeft size={16} />
        </IconButton>
        <div className="flex items-center gap-2 text-text-secondary">
          <History size={18} />
          <h2 className="text-lg font-semibold">Version History</h2>
        </div>
        <span className="min-w-0 truncate text-sm text-text-muted sm:max-w-xs">— {noteTitle}</span>
      </div>

      <p className="mb-6 text-xs text-text-muted">
        Versions are saved every 5 minutes while editing. Kept for 30 days, up to 100 per note.
      </p>

      {isLoading ? (
        <div className="pt-16 text-center text-sm text-text-muted">Loading...</div>
      ) : versions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 pt-16 text-text-muted">
          <History size={32} strokeWidth={1} />
          <p className="text-sm">No versions yet</p>
          <p className="text-xs">Versions are created after 5 minutes of editing</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-6 md:flex-row">
          {/* Version list */}
          <div className="flex max-h-72 shrink-0 flex-col gap-1 overflow-y-auto md:max-h-none md:w-64">
            {versions.map((v) => (
              <button
                key={v.id}
                onClick={() => handleSelect(v.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selectedId === v.id
                    ? "border-accent bg-accent/5 text-text"
                    : "border-border bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:text-text"
                }`}
              >
                <div className="text-sm font-medium truncate">{v.title || "Untitled"}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
                  <span>{timeAgo(v.created_at)}</span>
                  <span>{v.word_count} words</span>
                </div>
                {v.preview && (
                  <div className="mt-1.5 text-[11px] text-text-muted truncate">{v.preview}</div>
                )}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="flex-1 min-w-0 flex flex-col">
            {preview ? (
              <>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-text-muted">
                    {selectedVersion ? timeAgo(selectedVersion.created_at) : ""}
                  </span>
                  <button
                    onClick={handleRestore}
                    disabled={restore.isPending}
                    className="flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:py-1.5"
                  >
                    <RotateCcw size={13} />
                    {restore.isPending ? "Restoring..." : "Restore this version"}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-surface-secondary p-4 sm:p-6">
                  <RichTextPreview content={preview.content} />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
                Select a version to preview
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
