import * as React from "react";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_HIGH,
  DecoratorNode,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ESCAPE_COMMAND,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { notesQuery, noteQuery } from "../lib/queries";

// --------------------------------------------------------------------------
// Node
// --------------------------------------------------------------------------

export type SerializedWikiLinkNode = Spread<
  {
    noteId: string;
    titleSnapshot: string;
    type: "wiki-link";
    version: 1;
  },
  SerializedLexicalNode
>;

/**
 * Inline reference to another note. Stores the canonical noteId; the
 * `titleSnapshot` is sugar that survives in markdown but isn't trusted —
 * the rendered chip always shows the *current* title fetched via
 * `noteQuery`. If the target is in trash or permanently deleted, the chip
 * shows a "broken link" style.
 */
export class WikiLinkNode extends DecoratorNode<React.ReactNode> {
  __noteId: string;
  __titleSnapshot: string;

  static getType() {
    return "wiki-link";
  }

  static clone(node: WikiLinkNode): WikiLinkNode {
    return new WikiLinkNode(node.__noteId, node.__titleSnapshot, node.__key);
  }

  constructor(noteId: string, titleSnapshot: string, key?: NodeKey) {
    super(key);
    this.__noteId = noteId;
    this.__titleSnapshot = titleSnapshot;
  }

  getNoteId(): string {
    return this.__noteId;
  }

  getTitleSnapshot(): string {
    return this.__titleSnapshot;
  }

  isInline(): boolean {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const el = document.createElement("span");
    el.style.display = "inline";
    return el;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): React.ReactNode {
    return <WikiLink noteId={this.__noteId} fallback={this.__titleSnapshot} />;
  }

  static importJSON(serialized: SerializedWikiLinkNode): WikiLinkNode {
    return $createWikiLinkNode(serialized.noteId, serialized.titleSnapshot);
  }

  exportJSON(): SerializedWikiLinkNode {
    return {
      type: "wiki-link",
      version: 1,
      noteId: this.__noteId,
      titleSnapshot: this.__titleSnapshot,
    };
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  exportDOM(): DOMExportOutput {
    const a = document.createElement("a");
    a.href = `/notes/${this.__noteId}`;
    a.textContent = this.__titleSnapshot;
    return { element: a };
  }

  getTextContent(): string {
    // Used by some Lexical internals (search, accessibility). Show the
    // title snapshot — current title is async only.
    return this.__titleSnapshot;
  }
}

export function $createWikiLinkNode(noteId: string, titleSnapshot: string): WikiLinkNode {
  return new WikiLinkNode(noteId, titleSnapshot);
}

export function $isWikiLinkNode(node: LexicalNode | null | undefined): node is WikiLinkNode {
  return node instanceof WikiLinkNode;
}

// --------------------------------------------------------------------------
// Display
// --------------------------------------------------------------------------

function WikiLink({ noteId, fallback }: { noteId: string; fallback: string }) {
  const navigate = useNavigate();
  // 404 = note doesn't exist (trashed-and-purged or never existed). The
  // resolver throws on non-2xx; we catch via the error state below.
  const { data, error } = useQuery({
    ...noteQuery(noteId),
    retry: false,
  });

  const broken = !!error;
  const title = data?.title ?? fallback;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (broken) return;
    navigate({ to: "/notes/$id", params: { id: noteId } });
  };

  return (
    <a
      href={`/notes/${noteId}`}
      onClick={handleClick}
      data-wiki-link="true"
      title={broken ? "Linked note has been deleted" : title}
      className={`inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 align-baseline text-[0.95em] no-underline transition-colors ${
        broken
          ? "border-red-500/30 bg-red-500/10 text-red-600 line-through"
          : "border-border bg-surface-secondary text-text hover:border-accent/40 hover:text-accent"
      }`}
    >
      <FileText size={11} className="flex-shrink-0 opacity-70" />
      <span className="truncate">{title}</span>
    </a>
  );
}

// --------------------------------------------------------------------------
// Picker — opens when the user types `[[`, fuzzy-searches the user's
// notes, and inserts a WikiLinkNode on selection.
// --------------------------------------------------------------------------

interface PickerState {
  nodeKey: NodeKey;
  startOffset: number; // offset of the `[[` in the host text node
  query: string;
  rect: DOMRect | null;
}

export function WikiLinkPlugin() {
  const [editor] = useLexicalComposerContext();
  const [pickerState, setPickerState] = useState<PickerState | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pickerStateRef = useRef<PickerState | null>(null);
  pickerStateRef.current = pickerState;

  const { data: notes } = useQuery(notesQuery());
  const results = useMemo(() => {
    if (!pickerState) return [];
    const q = pickerState.query.toLowerCase();
    const all = notes ?? [];
    if (!q) return all.slice(0, 8);
    return all
      .filter((n) => n.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [pickerState, notes]);

  // Detect [[query at the cursor on every editor update.
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          if (pickerStateRef.current) setPickerState(null);
          return;
        }
        const anchor = selection.anchor;
        const node = anchor.getNode();
        if (!$isTextNode(node)) {
          if (pickerStateRef.current) setPickerState(null);
          return;
        }
        const offset = anchor.offset;
        const before = node.getTextContent().slice(0, offset);
        const m = before.match(/\[\[([^[\]\n]*)$/);
        if (!m) {
          if (pickerStateRef.current) setPickerState(null);
          return;
        }
        const startOffset = offset - m[0].length;
        const range = window.getSelection()?.getRangeAt(0);
        const rect = range?.getBoundingClientRect() ?? null;
        setPickerState({
          nodeKey: node.getKey(),
          startOffset,
          query: m[1],
          rect,
        });
        setSelectedIndex(0);
      });
    });
  }, [editor]);

  const close = useCallback(() => setPickerState(null), []);

  const insertSelected = useCallback(
    (idx: number) => {
      const state = pickerStateRef.current;
      if (!state) return;
      const note = results[idx];
      if (!note) return;
      editor.update(() => {
        const node = $getNodeByKey(state.nodeKey);
        if (!$isTextNode(node)) return;
        const text = node.getTextContent();
        const before = text.slice(0, state.startOffset);
        const after = text.slice(state.startOffset + 2 + state.query.length);
        // Replace `[[query` with a WikiLinkNode. Preserve text before/after.
        if (before) node.setTextContent(before);
        else node.remove();
        const chip = $createWikiLinkNode(note.id, note.title);
        if (before) {
          const beforeNode = $getNodeByKey(state.nodeKey);
          if ($isTextNode(beforeNode)) beforeNode.insertAfter(chip);
        } else {
          // The text node was removed; insert at selection.
          const sel = $getSelection();
          if ($isRangeSelection(sel)) sel.insertNodes([chip]);
        }
        if (after) chip.insertAfter($createTextNode(after));
        chip.selectNext();
      });
      setPickerState(null);
    },
    [editor, results],
  );

  // Arrow keys + Enter + Escape only when picker is open.
  useEffect(() => {
    if (!pickerState) return;
    const removeDown = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      () => {
        if (!pickerStateRef.current) return false;
        setSelectedIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const removeUp = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      () => {
        if (!pickerStateRef.current) return false;
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const removeEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        if (!pickerStateRef.current) return false;
        if (results.length === 0) {
          // No match — let the Enter through and close.
          setPickerState(null);
          return false;
        }
        insertSelected(selectedIndex);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const removeEscape = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        if (!pickerStateRef.current) return false;
        setPickerState(null);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    return () => {
      removeDown();
      removeUp();
      removeEnter();
      removeEscape();
    };
  }, [editor, pickerState, results, selectedIndex, insertSelected]);

  // Atomic backspace delete (mirrors the URL chip behavior).
  useEffect(() => {
    return editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
        const anchor = selection.anchor;
        const node = anchor.getNode();
        if ($isTextNode(node) && anchor.offset === 0) {
          const prev = node.getPreviousSibling();
          if ($isWikiLinkNode(prev)) {
            prev.remove();
            return true;
          }
        }
        if (anchor.type === "element" && $isElementNode(node)) {
          const parent = node;
          const prev = parent.getChildAtIndex(anchor.offset - 1);
          if (prev && $isWikiLinkNode(prev)) {
            prev.remove();
            return true;
          }
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  if (!pickerState || !pickerState.rect) return null;
  return (
    <Picker
      rect={pickerState.rect}
      query={pickerState.query}
      results={results}
      selectedIndex={selectedIndex}
      onSelect={insertSelected}
      onHover={setSelectedIndex}
      onClose={close}
    />
  );
}

interface PickerProps {
  rect: DOMRect;
  query: string;
  results: { id: string; title: string }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
  onClose: () => void;
}

function Picker({ rect, query, results, selectedIndex, onSelect, onHover, onClose }: PickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Position below the [[ caret. Constrain to viewport.
  const style: React.CSSProperties = {
    top: rect.bottom + 4,
    left: Math.min(rect.left, window.innerWidth - 320),
  };

  // Click-outside to close.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="listbox"
      style={style}
      className="fixed z-50 w-72 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
    >
      <div className="border-b border-border px-3 py-2 text-[11px] text-text-muted">
        {query ? `Linking note matching "${query}"` : "Type to search notes"}
      </div>
      <ul className="max-h-72 overflow-y-auto py-1">
        {results.length === 0 && (
          <li className="px-3 py-2 text-[12px] text-text-muted">No matching notes.</li>
        )}
        {results.map((n, i) => (
          <li
            key={n.id}
            role="option"
            aria-selected={i === selectedIndex}
            onMouseEnter={() => onHover(i)}
            onMouseDown={(e) => { e.preventDefault(); onSelect(i); }}
            className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] ${
              i === selectedIndex ? "bg-surface-hover text-accent" : "text-text"
            }`}
          >
            <FileText size={12} className="flex-shrink-0 opacity-60" />
            <span className="truncate">{n.title || "Untitled"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
