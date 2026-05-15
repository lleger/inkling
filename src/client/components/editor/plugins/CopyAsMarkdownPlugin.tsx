import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertToMarkdownString } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HashtagNode } from "@lexical/hashtag";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COPY_COMMAND,
  KEY_DOWN_COMMAND,
  createEditor,
  type SerializedEditorState,
  type SerializedLexicalNode,
} from "lexical";
import {
  $generateJSONFromSelectedNodes,
  $getClipboardDataFromSelection,
  setLexicalClipboardDataTransfer,
} from "@lexical/clipboard";
import { UrlChipNode } from "../../UrlChipNode";
import { WikiLinkNode } from "../../WikiLinkNode";
import { TRANSFORMERS } from "../../../lib/markdown-transformers";

type SerializedParagraph = SerializedLexicalNode & {
  children: SerializedLexicalNode[];
  direction: null;
  format: "";
  indent: 0;
};

function getSelectedMarkdown(editor: ReturnType<typeof createEditor>) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || selection.isCollapsed()) return null;

  // Serialize the selection to JSON, hydrate it in a headless editor,
  // then ask the markdown transformers to render it.
  const json = $generateJSONFromSelectedNodes<SerializedLexicalNode>(editor, selection);

  // Inline-only selections (within a single paragraph) come back as text/link
  // nodes which can't be root-level. Wrap them in a paragraph.
  const ELEMENT_OR_DECORATOR_TYPES = new Set([
    "paragraph",
    "heading",
    "quote",
    "list",
    "code",
    "table",
    "horizontalrule",
  ]);
  const wrappedChildren = json.nodes.every((n) => ELEMENT_OR_DECORATOR_TYPES.has(n.type))
    ? json.nodes
    : [
        {
          type: "paragraph",
          version: 1,
          direction: null,
          format: "",
          indent: 0,
          children: json.nodes,
        } satisfies SerializedParagraph,
      ];

  const headless = createEditor({
    namespace: "inkling-copy",
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      LinkNode,
      AutoLinkNode,
      TableNode,
      TableRowNode,
      TableCellNode,
      HashtagNode,
      HorizontalRuleNode,
      UrlChipNode,
      WikiLinkNode,
    ],
  });
  const serializedRoot: SerializedEditorState = {
    root: {
      type: "root",
      children: wrappedChildren,
      direction: null,
      format: "",
      indent: 0,
      version: 1,
    },
  };
  const state = headless.parseEditorState(serializedRoot);
  headless.setEditorState(state);

  let md = "";
  headless.getEditorState().read(() => {
    md = $convertToMarkdownString(TRANSFORMERS);
  });
  return md;
}

interface CopyAsMarkdownPluginProps {
  copyMarkdownByDefault?: boolean;
}

export function CopyAsMarkdownPlugin({ copyMarkdownByDefault = false }: CopyAsMarkdownPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregisterCopy = editor.registerCommand<ClipboardEvent>(
      COPY_COMMAND,
      (event) => {
        if (!event.clipboardData) return false;
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || selection.isCollapsed()) return false;

        if (copyMarkdownByDefault) {
          const md = getSelectedMarkdown(editor);
          if (md === null) return false;
          event.clipboardData.setData("text/plain", md);
        } else {
          setLexicalClipboardDataTransfer(
            event.clipboardData,
            $getClipboardDataFromSelection(selection),
          );
        }

        event.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    const unregisterShortcut = editor.registerCommand<KeyboardEvent>(
      KEY_DOWN_COMMAND,
      (event) => {
        const isMac = navigator.platform.includes("Mac");
        const hasShortcutModifiers = isMac
          ? event.metaKey && event.ctrlKey && event.shiftKey
          : event.ctrlKey && event.altKey && event.shiftKey;
        if (!hasShortcutModifiers || event.key.toLowerCase() !== "c") {
          return false;
        }

        const md = getSelectedMarkdown(editor);
        if (md === null) return false;
        event.preventDefault();
        if (navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(md);
        } else {
          const copyMarkdown = (copyEvent: ClipboardEvent) => {
            copyEvent.clipboardData?.setData("text/plain", md);
            copyEvent.preventDefault();
          };
          document.addEventListener("copy", copyMarkdown, { once: true });
          document.execCommand("copy");
        }
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    return () => {
      unregisterCopy();
      unregisterShortcut();
    };
  }, [copyMarkdownByDefault, editor]);

  return null;
}
