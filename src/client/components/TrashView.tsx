import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, RotateCcw, X } from "lucide-react";
import { restoreNote, permanentlyDeleteNote } from "../lib/api";
import { trashQuery, queryKeys } from "../lib/queries";
import { useUI } from "../context/UIContext";
import { AlertDialog } from "./ui/AlertDialog";
import { IconButton } from "./ui/IconButton";
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

export function TrashView() {
  const qc = useQueryClient();
  const { showToast } = useUI();
  const { data: notes = [], isLoading } = useQuery(trashQuery());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.trash });
    qc.invalidateQueries({ queryKey: queryKeys.notes });
  };

  const restore = useMutation({ mutationFn: restoreNote, onSuccess: invalidate });
  const purge = useMutation({ mutationFn: permanentlyDeleteNote, onSuccess: invalidate });

  const deleteNote = notes.find((note) => note.id === deleteId);

  const handleRestore = (id: string, title: string) => {
    restore.mutate(id, {
      onSuccess: () => showToast({ message: `Restored "${title}"` }),
    });
  };

  const handlePermanentDelete = () => {
    if (!deleteId) return;
    const title = deleteNote?.title || "Untitled";
    purge.mutate(deleteId, {
      onSuccess: () => {
        setDeleteId(null);
        showToast({ message: `Permanently deleted "${title}"` });
      },
    });
  };

  return (
    <>
      <PageContainer>
        <div className="mb-8 flex items-center gap-2 text-text-secondary">
          <Trash2 size={18} />
          <h2 className="text-lg font-semibold">Trash</h2>
        </div>

        <p className="mb-6 text-xs text-text-muted">
          Deleted notes are kept for 30 days, then permanently removed.
        </p>

        {isLoading ? (
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
                className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-secondary p-3 transition-colors hover:bg-surface-hover"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text">{note.title || "Untitled"}</div>
                  <div className="mt-0.5 text-[11px] text-text-muted">
                    Deleted {timeAgo(note.deleted_at)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <IconButton
                    buttonSize="md"
                    onClick={() => handleRestore(note.id, note.title || "Untitled")}
                    title="Restore"
                    aria-label={`Restore ${note.title || "Untitled"}`}
                    className="hover:text-accent sm:size-7"
                  >
                    <RotateCcw size={14} />
                  </IconButton>
                  <IconButton
                    buttonSize="md"
                    onClick={() => setDeleteId(note.id)}
                    title="Delete permanently"
                    aria-label={`Delete ${note.title || "Untitled"} permanently`}
                    className="hover:text-red-500 sm:size-7"
                  >
                    <X size={14} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Permanently delete note?"
        description={
          <>
            This will permanently delete "{deleteNote?.title || "Untitled"}". This action cannot be
            undone.
          </>
        }
        confirmLabel="Delete permanently"
        pendingLabel="Deleting..."
        confirmPending={purge.isPending}
        destructive
        onConfirm={handlePermanentDelete}
      />
    </>
  );
}
