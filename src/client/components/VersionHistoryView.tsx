import { useState, useEffect, useCallback } from "react";
import { History, RotateCcw, ArrowLeft } from "lucide-react";
import { fetchVersions, fetchVersion, restoreVersion } from "../lib/api";
import { RichTextPreview } from "./RichTextPreview";
import type { NoteVersionMeta, Note } from "../types";

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

export function VersionHistoryView({ noteId, noteTitle, onClose, onRestore }: VersionHistoryViewProps) {
  const [versions, setVersions] = useState<NoteVersionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchVersions(noteId);
      setVersions(data);
    } catch (err) {
      console.error("Failed to load versions:", err);
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = useCallback(
    async (versionId: string) => {
      setSelectedId(versionId);
      try {
        const version = await fetchVersion(noteId, versionId);
        setPreviewContent(version.content);
      } catch (err) {
        console.error("Failed to load version:", err);
      }
    },
    [noteId],
  );

  const handleRestore = useCallback(async () => {
    if (!selectedId) return;
    setRestoring(true);
    try {
      const note = await restoreVersion(noteId, selectedId);
      onRestore(note);
    } catch (err) {
      console.error("Failed to restore version:", err);
      setRestoring(false);
    }
  }, [noteId, selectedId, onRestore]);

  return (
    <div className="flex w-full max-w-[900px] flex-col px-6 pt-10 pb-24 min-h-full animate-[fade-in_0.2s_ease-out]">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
          title="Back to note"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2 text-text-secondary">
          <History size={18} />
          <h2 className="text-lg font-semibold">Version History</h2>
        </div>
        <span className="text-sm text-text-muted">— {noteTitle}</span>
      </div>

      <p className="mb-6 text-xs text-text-muted">
        Versions are saved every 5 minutes while editing. Kept for 30 days, up to 100 per note.
      </p>

      {loading ? (
        <div className="pt-16 text-center text-sm text-text-muted">Loading...</div>
      ) : versions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 pt-16 text-text-muted">
          <History size={32} strokeWidth={1} />
          <p className="text-sm">No versions yet</p>
          <p className="text-xs">Versions are created after 5 minutes of editing</p>
        </div>
      ) : (
        <div className="flex gap-6 flex-1 min-h-0">
          {/* Version list */}
          <div className="w-64 shrink-0 overflow-y-auto flex flex-col gap-1">
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
            {previewContent !== null ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-text-muted">
                    {versions.find((v) => v.id === selectedId)?.created_at
                      ? timeAgo(versions.find((v) => v.id === selectedId)!.created_at)
                      : ""}
                  </span>
                  <button
                    onClick={handleRestore}
                    disabled={restoring}
                    className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <RotateCcw size={13} />
                    {restoring ? "Restoring..." : "Restore this version"}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-surface-secondary p-6">
                  <RichTextPreview content={previewContent} />
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
    </div>
  );
}
