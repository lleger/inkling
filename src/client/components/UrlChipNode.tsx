import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $nodesOfType,
  COMMAND_PRIORITY_LOW,
  DecoratorNode,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  PASTE_COMMAND,
  TextNode,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import * as React from "react";
import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { UrlChip } from "./UrlChip";

export type SerializedUrlChipNode = Spread<
  { url: string; type: "url-chip"; version: 1 },
  SerializedLexicalNode
>;

/**
 * An inline URL chip node — replaces a bare URL in flowing text with a
 * Linear-style pill (favicon + title) that resolves metadata via /api/og.
 *
 * Intentionally inline (`isInline() => true`) so it lives within paragraphs,
 * not as a block. Atomic semantics ensure backspace deletes the whole chip.
 */
export class UrlChipNode extends DecoratorNode<React.ReactNode> {
  __url: string;

  static getType(): string {
    return "url-chip";
  }

  static clone(node: UrlChipNode): UrlChipNode {
    return new UrlChipNode(node.__url, node.__key);
  }

  constructor(url: string, key?: NodeKey) {
    super(key);
    this.__url = url;
  }

  getUrl(): string {
    return this.__url;
  }

  isInline(): boolean {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }

  // DecoratorNode default: backspace adjacent to the node selects it (one
  // press), the next press deletes it. That's the Linear behavior.

  createDOM(_config: EditorConfig): HTMLElement {
    const el = document.createElement("span");
    el.style.display = "inline";
    return el;
  }

  updateDOM(): false {
    return false;
  }

  decorate(_editor: LexicalEditor): React.ReactNode {
    return <UrlChip url={this.__url} mode="inline" />;
  }

  static importJSON(serialized: SerializedUrlChipNode): UrlChipNode {
    return $createUrlChipNode(serialized.url);
  }

  exportJSON(): SerializedUrlChipNode {
    return { type: "url-chip", version: 1, url: this.__url };
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  exportDOM(): DOMExportOutput {
    const a = document.createElement("a");
    a.href = this.__url;
    a.textContent = this.__url;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    return { element: a };
  }

  getTextContent(): string {
    // Round-trip in markdown as the bare URL — the markdown transformer
    // wraps it in `<...>` if needed. Plain text export shows the URL.
    return this.__url;
  }
}

export function $createUrlChipNode(url: string): UrlChipNode {
  return new UrlChipNode(url);
}

export function $isUrlChipNode(node: LexicalNode | null | undefined): node is UrlChipNode {
  return node instanceof UrlChipNode;
}

// --------------------------------------------------------------------------
// Plugin: detect bare URLs and convert them to chips on space / enter / blur.
// Pasted URLs convert immediately.
// --------------------------------------------------------------------------

// Match a "bare URL ending the text node": http(s)://... right at the end.
// Trailing punctuation that's typically not part of the URL gets excluded.
const TRAILING_URL_RE = /(https?:\/\/[^\s<>"]+?)([.,;:!?)\]]*)$/;
// Standalone URL (whole text node is one URL).
const FULL_URL_RE = /^https?:\/\/[^\s<>"]+$/;

export function UrlChipPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([UrlChipNode])) {
      console.error("UrlChipNode not registered on the editor");
      return;
    }

    // 1. Convert on Space (or any whitespace) — the most common trigger.
    //    Runs whenever a text node updates; cheap.
    const removeSpace = editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
      const text = textNode.getTextContent();
      const m = text.match(/(https?:\/\/[^\s<>"]+?)([.,;:!?)\]]*)(\s)$/);
      if (!m) return;
      const [, url, trailingPunct, ws] = m;
      const beforeUrl = text.slice(0, text.length - m[0].length);
      replaceWithChip(textNode, beforeUrl, url, trailingPunct + ws);
    });

    // 2. Convert on Enter — registered before the default enter handler so
    //    we get to convert the URL before the line break splits things.
    const removeEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
        const anchor = selection.anchor.getNode();
        if (!$isTextNode(anchor)) return false;
        const text = anchor.getTextContent();
        const m = text.match(TRAILING_URL_RE);
        if (!m) return false;
        const [, url, trailing] = m;
        const beforeUrl = text.slice(0, text.length - m[0].length);
        replaceWithChip(anchor, beforeUrl, url, trailing);
        // Fall through (return false) so the Enter still inserts the line.
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    // 3. Convert on Blur — sweep the whole editor for trailing URLs that
    //    haven't been chipified by the other triggers.
    const onBlur = () => {
      editor.update(() => {
        for (const node of $nodesOfType(TextNode)) {
          const text = node.getTextContent();
          const m = text.match(TRAILING_URL_RE);
          if (!m) continue;
          const [, url, trailing] = m;
          const beforeUrl = text.slice(0, text.length - m[0].length);
          replaceWithChip(node, beforeUrl, url, trailing);
        }
      });
    };
    const removeBlur = editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement) prevRootElement.removeEventListener("blur", onBlur);
      if (rootElement) rootElement.addEventListener("blur", onBlur);
    });

    // 4. Backspace at the start of a text node OR at offset 0 with a chip
    //    immediately before → delete the chip atomically. This implements
    //    the Linear/Notion behavior where one backspace erases a chip.
    const removeBackspace = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
        const anchor = selection.anchor;
        const node = anchor.getNode();
        // Case 1: caret inside a text node at offset 0 — check previous sibling.
        if ($isTextNode(node) && anchor.offset === 0) {
          const prev = node.getPreviousSibling();
          if ($isUrlChipNode(prev)) {
            prev.remove();
            return true;
          }
        }
        // Case 2: caret element selection just after a chip.
        if (anchor.type === "element") {
          const parent = node;
          const prev = parent.getChildAtIndex?.(anchor.offset - 1);
          if (prev && $isUrlChipNode(prev)) {
            prev.remove();
            return true;
          }
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    // 5. Paste handler — if the clipboard text looks like one or more URLs,
    //    insert chips directly (skipping the typed-then-converted dance).
    const removePaste = editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        if (!(event instanceof ClipboardEvent)) return false;
        const text = event.clipboardData?.getData("text/plain");
        if (!text) return false;
        const trimmed = text.trim();

        // Whole clipboard is a single URL → insert one chip.
        if (FULL_URL_RE.test(trimmed)) {
          event.preventDefault();
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            const chip = $createUrlChipNode(trimmed);
            selection.insertNodes([chip]);
          });
          return true;
        }
        // Otherwise let the default paste happen (URLs inside larger pastes
        // remain plain text — the per-textNode transform will pick them up
        // if they end up trailing).
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      removeSpace();
      removeEnter();
      removeBlur();
      removeBackspace();
      removePaste();
    };
  }, [editor]);

  return null;
}

function replaceWithChip(
  textNode: TextNode,
  before: string,
  url: string,
  after: string,
) {
  const chip = $createUrlChipNode(url);
  if (before.length > 0) {
    textNode.setTextContent(before);
    textNode.insertAfter(chip);
  } else {
    textNode.replace(chip);
  }
  if (after.length > 0) {
    chip.insertAfter($createTextNode(after));
  }
  // Place caret immediately after the chip (or after the trailing text if any).
  const lastInserted = after.length > 0 ? chip.getNextSibling() : chip;
  if (lastInserted && $isTextNode(lastInserted)) {
    lastInserted.select(lastInserted.getTextContentSize(), lastInserted.getTextContentSize());
  } else {
    chip.selectNext();
  }
}

