import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { X, Folder, FolderPlus } from "lucide-react";

interface MoveToFolderModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (folder: string | null) => void;
  currentFolder: string | null;
  allFolders: string[];
}

export function MoveToFolderModal({ open, onClose, onSelect, currentFolder, allFolders }: MoveToFolderModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const options = useMemo(() => {
    const items: { label: string; value: string | null; isNew: boolean }[] = [];

    // "Remove from folder" option if currently in a folder
    if (currentFolder) {
      items.push({ label: "Move to root (no folder)", value: null, isNew: false });
    }

    // Filter existing folders
    const q = query.toLowerCase().trim();
    const matched = q
      ? allFolders.filter((f) => f.toLowerCase().includes(q))
      : allFolders;

    for (const f of matched) {
      if (f === currentFolder) continue; // skip current
      items.push({ label: f, value: f, isNew: false });
    }

    // Offer to create if query doesn't match an existing folder exactly
    if (q && !allFolders.some((f) => f.toLowerCase() === q)) {
      items.push({ label: query.trim(), value: query.trim(), isNew: true });
    }

    return items;
  }, [query, allFolders, currentFolder]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, options.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && options[selectedIndex]) {
        e.preventDefault();
        onSelect(options[selectedIndex].value);
        onClose();
      }
    },
    [options, selectedIndex, onSelect, onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-surface-overlay animate-[fade-in_0.1s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-2xl animate-[scale-in_0.1s_ease-out]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Folder size={15} className="shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or create folder..."
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted outline-none"
          />
          <button
            onClick={onClose}
            className="flex size-5 items-center justify-center rounded text-text-muted hover:text-text-secondary"
          >
            <X size={12} />
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto py-1">
          {options.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-text-muted">
              Type a folder name to create one
            </div>
          )}

          {options.map((opt, i) => (
            <button
              key={opt.value ?? "__root__"}
              onClick={() => { onSelect(opt.value); onClose(); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                i === selectedIndex
                  ? "bg-surface-hover text-text"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text"
              }`}
            >
              {opt.isNew ? (
                <FolderPlus size={14} className="shrink-0 text-accent" />
              ) : (
                <Folder size={14} className="shrink-0 text-text-muted" />
              )}
              <span className="flex-1 truncate">
                {opt.isNew ? `Create "${opt.label}"` : opt.label}
              </span>
              {opt.value === null && (
                <span className="text-[11px] text-text-muted">unfiled</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[10px] text-text-muted">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface-secondary px-1 py-px">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface-secondary px-1 py-px">↵</kbd>
            select
          </span>
        </div>
      </div>
    </div>
  );
}
