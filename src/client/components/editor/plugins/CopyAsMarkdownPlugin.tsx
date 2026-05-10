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
  createEditor,
  type SerializedEditorState,
  type SerializedLexicalNode,
} from "lexical";
import { $generateJSONFromSelectedNodes } from "@lexical/clipboard";
import { UrlChipNode } from "../../UrlChipNode";
import { WikiLinkNode } from "../../WikiLinkNode";
import { TRANSFORMERS } from "../../../lib/markdown-transformers";

type SerializedParagraph = SerializedLexicalNode & {
  children: SerializedLexicalNode[];
  direction: null;
  format: "";
  indent: 0;
};

export function CopyAsMarkdownPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<ClipboardEvent>(
      COPY_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || selection.isCollapsed()) return false;
        if (!event.clipboardData) return false;

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
        const selectedNodes = json.nodes;
        const wrappedChildren = selectedNodes.every((n) => ELEMENT_OR_DECORATOR_TYPES.has(n.type))
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

        event.clipboardData.setData("text/plain", md);
        event.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}
