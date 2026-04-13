import { useEffect } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertFromMarkdownString } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { $getRoot } from "lexical";
import { richTextTheme } from "../lib/editor-theme";
import { TRANSFORMERS } from "../lib/markdown-transformers";
import { normalizeMarkdown } from "../lib/normalize-markdown";

function UpdatePlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      $convertFromMarkdownString(normalizeMarkdown(content), TRANSFORMERS, root);
    });
  }, [editor, content]);

  return null;
}

interface RichTextPreviewProps {
  content: string;
}

export function RichTextPreview({ content }: RichTextPreviewProps) {
  const initialConfig = {
    namespace: "richtext-preview",
    theme: richTextTheme,
    editable: false,
    onError: (error: Error) => console.error(error),
    nodes: [
      HeadingNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      ListNode,
      ListItemNode,
      LinkNode,
      AutoLinkNode,
      TableNode,
      TableRowNode,
      TableCellNode,
      HorizontalRuleNode,
    ],
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative min-h-[300px] editor-rich">
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input outline-none" />}
          placeholder={
            <div className="editor-placeholder pointer-events-none absolute top-0 left-0 select-none text-text-muted">
              Preview
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <CheckListPlugin />
        <TablePlugin />
        <HorizontalRulePlugin />
        <UpdatePlugin content={content} />
      </div>
    </LexicalComposer>
  );
}
