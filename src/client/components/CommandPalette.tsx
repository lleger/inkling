import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, FileText, FilePlus } from "lucide-react";
import type { NoteMeta } from "../types";
import { Dialog } from "./ui/Dialog";
import { Input } from "./ui/Input";
import { Kbd } from "./ui/Kbd";

export interface PaletteAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: "action" | "note";
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  notes: NoteMeta[];
  actions: PaletteAction[];
  onSelectNote: (id: string) => void;
  onCreateWithTitle: (title: string) => void;
}

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette({
  open,
  onClose,
  notes,
  actions,
  onSelectNote,
  onCreateWithTitle,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build filtered results
  const results = useMemo(() => {
    const items: PaletteAction[] = [];

    if (!query.trim()) {
      // Show actions first, then recent notes
      items.push(...actions);
      for (const note of notes.slice(0, 8)) {
        items.push({
          id: `note-${note.id}`,
          label: note.title || "Untitled",
          icon: <FileText size={15} />,
          category: "note",
          onSelect: () => onSelectNote(note.id),
        });
      }
      return items;
    }

    // Filter actions
    const matchedActions = actions.filter((a) => fuzzyMatch(a.label, query));
    items.push(...matchedActions);

    // Filter notes
    const matchedNotes = notes
      .filter((n) => fuzzyMatch(n.title || "Untitled", query) || fuzzyMatch(n.preview, query))
      .slice(0, 10);

    for (const note of matchedNotes) {
      items.push({
        id: `note-${note.id}`,
        label: note.title || "Untitled",
        icon: <FileText size={15} />,
        category: "note",
        onSelect: () => onSelectNote(note.id),
      });
    }

    // Create option last — fallback when nothing else matches well
    items.push({
      id: "create-from-query",
      label: `Create "${query.trim()}"`,
      icon: <FilePlus size={15} />,
      category: "action",
      onSelect: () => onCreateWithTitle(query.trim()),
    });

    return items;
  }, [query, actions, notes, onSelectNote, onCreateWithTitle]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Keep selected index in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView?.({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        results[selectedIndex].onSelect();
        onClose();
      }
    },
    [results, selectedIndex, onClose],
  );

  // Build render list: items with section headers inserted
  const renderItems: (
    | { type: "header"; label: string }
    | { type: "item"; item: PaletteAction; index: number }
  )[] = [];
  let lastCategory: string | null = null;
  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    if (item.category !== lastCategory) {
      renderItems.push({ type: "header", label: item.category === "action" ? "Actions" : "Notes" });
      lastCategory = item.category;
    }
    renderItems.push({ type: "item", item, index: i });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title="Command palette"
      description="Search notes and actions."
      initialFocus={inputRef}
      size="md"
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
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search size={15} className="shrink-0 text-text-muted" />
          <Input
            ref={inputRef}
            variant="ghost"
            inputSize="md"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes and actions..."
          />
          <Kbd size="xs" className="shrink-0">
            Esc
          </Kbd>
        </div>

        {/* Results */}
        <div key={query} ref={listRef} className="max-h-[min(18rem,55dvh)] overflow-y-auto py-1">
          {results.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-text-muted">No results</div>
          )}

          {renderItems.map((entry, i) => {
            if (entry.type === "header") {
              return (
                <div
                  key={`header-${i}`}
                  className={`px-3 ${i === 0 ? "pt-1.5" : "pt-2.5"} pb-1 text-[10px] font-medium uppercase tracking-widest text-text-muted motion-list-item-in`}
                >
                  {entry.label}
                </div>
              );
            }
            const { item, index } = entry;
            return (
              <button
                key={item.id}
                onClick={() => {
                  item.onSelect();
                  onClose();
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors motion-list-item-in ${
                  index === selectedIndex
                    ? "bg-surface-hover text-text motion-pop-in"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text"
                }`}
              >
                <span className="shrink-0 text-text-muted">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
