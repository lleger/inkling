import { useState, useMemo, useCallback, useRef } from "react";
import { Search, Plus, FileText, CheckSquare, X, Upload } from "lucide-react";
import type { NoteMeta } from "../types";

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

interface HomePageProps {
  notes: NoteMeta[];
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  onImportFiles: (files: FileList | File[]) => void;
  allTags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export function HomePage({ notes, onSelectNote, onCreateNote, onDeleteNote, onImportFiles, allTags, selectedTag, onSelectTag }: HomePageProps) {
  const [query, setQuery] = useState("");
  const [dragFiles, setDragFiles] = useState<string[]>([]);
  const dragCountRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current++;
    if (dragCountRef.current === 1) {
      // Try to get file names from dataTransfer
      const names: string[] = [];
      if (e.dataTransfer.files.length > 0) {
        for (const f of Array.from(e.dataTransfer.files)) {
          names.push(f.name);
        }
      } else {
        // Fallback: count items (names not always available during drag)
        for (const item of Array.from(e.dataTransfer.items)) {
          if (item.kind === "file") names.push("file");
        }
      }
      setDragFiles(names.length > 0 ? names : ["file"]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current--;
    if (dragCountRef.current === 0) setDragFiles([]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCountRef.current = 0;
      setDragFiles([]);
      if (e.dataTransfer.files.length > 0) {
        onImportFiles(e.dataTransfer.files);
      }
    },
    [onImportFiles],
  );

  // Client-side filter
  const filtered = useMemo(() => {
    let result = notes;
    if (selectedTag) {
      result = result.filter((n) => {
        try { return (JSON.parse(n.tags) as string[]).includes(selectedTag); } catch { return false; }
      });
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.preview.toLowerCase().includes(q),
      );
    }
    return result;
  }, [notes, query, selectedTag]);

  const stats = useMemo(() => {
    const totalWords = notes.reduce((sum, n) => sum + n.word_count, 0);
    const totalTaskDone = notes.reduce((sum, n) => sum + n.task_done, 0);
    const totalTasks = notes.reduce((sum, n) => sum + n.task_total, 0);
    return { totalWords, totalTaskDone, totalTasks };
  }, [notes]);

  return (
    <div
      className={`flex w-full max-w-[680px] flex-col px-6 pt-12 pb-24 min-h-full animate-[fade-in_0.2s_ease-out] transition-colors ${
        dragFiles.length > 0 ? "bg-accent/5" : ""
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragFiles.length > 0 && (
        <div className="pointer-events-none mb-6 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-accent bg-accent/5 py-8 text-accent">
          <Upload size={24} />
          {dragFiles.some((n) => n !== "file") ? (
            <div className="flex flex-col items-center gap-1">
              {dragFiles.map((name, i) => (
                <span key={i} className="text-sm font-medium">
                  {name.replace(/\.(md|markdown|txt)$/, "")}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm font-medium">
              Drop {dragFiles.length === 1 ? "file" : `${dragFiles.length} files`} to import
            </span>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-8">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes..."
          className="w-full rounded-lg border border-border bg-surface-secondary py-2.5 pl-9 pr-9 text-sm text-text placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-5 items-center justify-center rounded text-text-muted hover:text-text-secondary"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
              className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors ${
                selectedTag === tag
                  ? "bg-accent text-white"
                  : "bg-surface-tertiary text-text-secondary hover:text-text"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Stats summary */}
      <div className="mb-8 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md bg-surface-tertiary px-2.5 py-1 text-[12px] text-text-secondary">
          <FileText size={13} />
          <span>{notes.length} {notes.length === 1 ? "note" : "notes"}</span>
        </div>
        <div className="rounded-md bg-surface-tertiary px-2.5 py-1 text-[12px] text-text-secondary">
          {stats.totalWords.toLocaleString()} words
        </div>
        {stats.totalTasks > 0 && (
          <div className="flex items-center gap-1.5 rounded-md bg-surface-tertiary px-2.5 py-1 text-[12px] text-text-secondary">
            <CheckSquare size={13} />
            <span>{stats.totalTaskDone}/{stats.totalTasks} tasks</span>
          </div>
        )}
      </div>

      {/* Notes grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* New note card — only show when not searching */}
          {!query && (
            <button
              onClick={onCreateNote}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-transparent py-8 text-text-muted transition-colors hover:border-text-muted hover:bg-surface-secondary hover:text-text-secondary"
            >
              <Plus size={20} strokeWidth={1.5} />
              <span className="text-xs font-medium">New Note</span>
            </button>
          )}

          {filtered.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              className="group relative cursor-pointer rounded-lg border border-border bg-surface-secondary p-4 text-left transition-all duration-150 hover:bg-surface-hover hover:-translate-y-0.5 hover:shadow-md"
            >
              <button
                className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-md text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-active hover:text-text"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNote(note.id);
                }}
                title="Delete"
              >
                <X size={13} />
              </button>
              <div className="mb-1 truncate pr-6 text-sm font-medium text-text">
                {note.title || "Untitled"}
              </div>
              {note.preview && (
                <div className="mb-3 line-clamp-2 text-xs leading-relaxed text-text-muted">
                  {note.preview}
                </div>
              )}
              <div className="flex items-center gap-3 text-[11px] text-text-muted">
                <span>{timeAgo(note.updated_at)}</span>
                <span>{note.word_count} words</span>
                {note.task_total > 0 && (
                  <span>
                    {note.task_done}/{note.task_total} tasks
                  </span>
                )}
              </div>
              {(() => {
                try {
                  const tags = JSON.parse(note.tags) as string[];
                  if (tags.length === 0) return null;
                  return (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-accent/10 px-2 py-px text-[10px] font-medium text-accent">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  );
                } catch { return null; }
              })()}
            </div>
          ))}
        </div>
      ) : query ? (
        <div className="flex flex-col items-center gap-3 pt-16 text-text-muted">
          <Search size={32} strokeWidth={1} />
          <p className="text-sm">No notes matching &ldquo;{query}&rdquo;</p>
          <button
            onClick={() => setQuery("")}
            className="text-xs text-accent hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 pt-16">
          <FileText size={40} strokeWidth={1} className="text-text-muted" />
          <div className="text-center">
            <p className="text-sm font-medium text-text-secondary">No notes yet</p>
            <p className="mt-1 text-xs text-text-muted">Create your first note to get started</p>
          </div>
          <button
            className="rounded-md bg-accent px-5 py-2 text-[13px] font-medium text-surface transition-opacity hover:opacity-90"
            onClick={onCreateNote}
          >
            New Note
          </button>
        </div>
      )}
    </div>
  );
}
