import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { X, Folder, FolderPlus } from "lucide-react";
import { Dialog, DialogClose } from "./ui/Dialog";
import { IconButton } from "./ui/IconButton";
import { Input } from "./ui/Input";
import { Kbd } from "./ui/Kbd";

interface MoveToFolderModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (folder: string | null) => void;
  currentFolder: string | null;
  allFolders: string[];
}

export function MoveToFolderModal({
  open,
  onClose,
  onSelect,
  currentFolder,
  allFolders,
}: MoveToFolderModalProps) {
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

  const options = useMemo(() => {
    const items: { label: string; value: string | null; isNew: boolean }[] = [];

    // "Remove from folder" option if currently in a folder
    if (currentFolder) {
      items.push({ label: "Move to root (no folder)", value: null, isNew: false });
    }

    // Filter existing folders
    const q = query.toLowerCase().trim();
    const matched = q ? allFolders.filter((f) => f.toLowerCase().includes(q)) : allFolders;

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

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title="Move note to folder"
      description="Search existing folders or create a new folder."
      initialFocus={inputRef}
      contentClassName="max-h-[calc(100dvh-5rem)] overflow-hidden"
      footer={
        <div className="flex items-center gap-3 px-3 py-2 text-[10px] text-text-muted">
          <span className="flex items-center gap-1">
            <Kbd size="xs">↑↓</Kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd size="xs">↵</Kbd>
            select
          </span>
        </div>
      }
    >
      <div onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Folder size={15} className="shrink-0 text-text-muted" />
          <Input
            ref={inputRef}
            variant="ghost"
            inputSize="md"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or create folder..."
          />
          <DialogClose render={<IconButton buttonSize="xs" hover="text" aria-label="Close" />}>
            <X size={12} />
          </DialogClose>
        </div>

        <div className="max-h-[min(15rem,50dvh)] overflow-y-auto py-1">
          {options.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-text-muted">
              Type a folder name to create one
            </div>
          )}

          {options.map((opt, i) => (
            <button
              key={opt.value ?? "__root__"}
              onClick={() => {
                onSelect(opt.value);
                onClose();
              }}
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
              {opt.value === null && <span className="text-[11px] text-text-muted">unfiled</span>}
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
