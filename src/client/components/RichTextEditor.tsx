import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HashtagNode } from "@lexical/hashtag";
import { $createParagraphNode, $getRoot, type EditorState } from "lexical";
import { ScrollIntoViewPlugin } from "./ScrollIntoViewPlugin";
import { FloatingToolbar } from "./FloatingToolbar";
import { UrlChipNode, UrlChipPlugin } from "./UrlChipNode";
import { WikiLinkNode, WikiLinkPlugin } from "./WikiLinkNode";
import { AutoFocusPlugin } from "./editor/plugins/AutoFocusPlugin";
import { ChecklistHitZonePlugin } from "./editor/plugins/ChecklistHitZonePlugin";
import { ChecklistShortcutPlugin } from "./editor/plugins/ChecklistShortcutPlugin";
import { ClickableLinkPlugin } from "./editor/plugins/ClickableLinkPlugin";
import { CopyAsMarkdownPlugin } from "./editor/plugins/CopyAsMarkdownPlugin";
import { ListIndentPlugin } from "./editor/plugins/ListIndentPlugin";
import { MarkdownPastePlugin } from "./editor/plugins/MarkdownPastePlugin";
import { SmartTypographyPlugin } from "./editor/plugins/SmartTypographyPlugin";
import { TagZonePlugin } from "./editor/plugins/TagZonePlugin";
import { richTextTheme } from "../lib/editor-theme";
import { TRANSFORMERS } from "../lib/markdown-transformers";
import { normalizeMarkdown } from "../lib/normalize-markdown";

interface RichTextEditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
  autoFocus?: boolean;
  smartTypography?: boolean;
}

export function RichTextEditor({
  initialContent,
  onChange,
  autoFocus = true,
  smartTypography = true,
}: RichTextEditorProps) {
  const initialConfig = {
    namespace: "richtext-editor",
    theme: richTextTheme,
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
      HashtagNode,
      UrlChipNode,
      WikiLinkNode,
    ],
    editorState: () => {
      $convertFromMarkdownString(initialContent, TRANSFORMERS);
      const root = $getRoot();
      if (/\n\s*\n$/.test(initialContent) && root.getLastChild()?.getTextContent() !== "") {
        root.append($createParagraphNode());
      }
      // Place cursor at end
      root.selectEnd();
    },
  };

  function handleChange(editorState: EditorState) {
    editorState.read(() => {
      // $convertToMarkdownString joins block nodes with \n\n, which corrupts
      // tables (rows must be contiguous) and accumulates blank lines inside
      // code blocks across round-trips. Normalize before emitting.
      onChange(normalizeMarkdown($convertToMarkdownString(TRANSFORMERS)));
    });
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative min-h-[300px] editor-rich">
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input outline-none caret-accent" />}
          placeholder={
            <div className="editor-placeholder pointer-events-none absolute top-0 left-0 select-none text-text-muted">
              Start writing...
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <ListIndentPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <MarkdownPastePlugin />
        <TablePlugin />
        <HorizontalRulePlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        {smartTypography && <SmartTypographyPlugin />}
        <TagZonePlugin />
        <ChecklistHitZonePlugin />
        <ChecklistShortcutPlugin />
        <FloatingToolbar />
        <ScrollIntoViewPlugin />
        <ClickableLinkPlugin />
        <CopyAsMarkdownPlugin />
        <UrlChipPlugin />
        <WikiLinkPlugin />
        {autoFocus && <AutoFocusPlugin />}
      </div>
    </LexicalComposer>
  );
}
