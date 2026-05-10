import { useEffect } from "react";
import { $convertFromMarkdownString } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  PASTE_COMMAND,
} from "lexical";
import { TRANSFORMERS } from "../../../lib/markdown-transformers";

const MARKDOWN_PATTERNS = [
  /^#{1,6}\s+\S/m,
  /^\s{0,3}>\s+\S/m,
  /^\s*([-+*]|\d+[.)])\s+\S/m,
  /^\s*[-+*]\s+\[[ xX]\]\s+\S/m,
  /^\s*(```|~~~)/m,
  /^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/m,
  /^\|.+\|\s*\n\|[\s:-]+\|/m,
  /(^|[^\\])\*\*[^\n*]+\*\*/,
  /(^|[^\\])__[^\n_]+__/,
  /(^|[^\\])`[^\n`]+`/,
  /\[[^\]\n]+\]\([^\s)]+\)/,
];

function looksLikeMarkdown(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return MARKDOWN_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function MarkdownPastePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        if (!("clipboardData" in event)) return false;
        const text = event.clipboardData?.getData("text/plain");
        if (!text || !looksLikeMarkdown(text)) return false;

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        event.preventDefault();

        const container = $createParagraphNode();
        $convertFromMarkdownString(text, TRANSFORMERS, container);
        const nodes = container.getChildren();
        if (nodes.length === 0) return true;

        selection.insertNodes(nodes);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}
