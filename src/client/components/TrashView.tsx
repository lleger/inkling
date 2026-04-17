import { useState, useEffect, useCallback } from "react";
import { Trash2, RotateCcw, X } from "lucide-react";
import { fetchTrash, restoreNote, permanentlyDeleteNote, type DeletedNoteMeta } from "../lib/api";

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

interface TrashViewProps {
  onNoteRestored: () => void;
}

export function TrashView({ onNoteRestored }: TrashViewProps) {
  const [notes, setNotes] = useState<DeletedNoteMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchTrash();
      setNotes(data);
    } catch (err) {
      console.error("Failed to load trash:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRestore = useCallback(
    async (id: string) => {
      await restoreNote(id);
      await load();
      onNoteRestored();
    },
    [load, onNoteRestored],
  );

  const handlePermanentDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Permanently delete this note? This cannot be undone.")) return;
      await permanentlyDeleteNote(id);
      await load();
    },
    [load],
  );

  return (
    <div className="flex w-full max-w-[680px] flex-col px-6 pt-12 pb-24 min-h-full animate-[fade-in_0.2s_ease-out]">
      <div className="mb-8 flex items-center gap-2 text-text-secondary">
        <Trash2 size={18} />
        <h2 className="text-lg font-semibold">Trash</h2>
      </div>

      <p className="mb-6 text-xs text-text-muted">
        Deleted notes are kept for 30 days, then permanently removed.
      </p>

      {loading ? (
        <div className="pt-16 text-center text-sm text-text-muted">Loading...</div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 pt-16 text-text-muted">
          <Trash2 size={32} strokeWidth={1} />
          <p className="text-sm">Trash is empty</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group flex items-center justify-between rounded-lg border border-border bg-surface-secondary p-3 transition-colors hover:bg-surface-hover"
            >
              <div>
                <div className="text-sm font-medium text-text">{note.title || "Untitled"}</div>
                <div className="mt-0.5 text-[11px] text-text-muted">
                  Deleted {timeAgo(note.deleted_at)}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => handleRestore(note.id)}
                  title="Restore"
                  className="flex size-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-active hover:text-accent"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={() => handlePermanentDelete(note.id)}
                  title="Delete permanently"
                  className="flex size-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-active hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
