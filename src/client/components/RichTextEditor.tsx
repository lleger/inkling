import { useEffect } from "react";
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
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
  type EditorState,
} from "lexical";
import { ScrollIntoViewPlugin } from "./ScrollIntoViewPlugin";
import { richTextTheme } from "../lib/editor-theme";
import { TRANSFORMERS } from "../lib/markdown-transformers";
import { getSmartReplacement } from "../lib/smart-typography";

function SmartTypographyPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;

        const anchor = selection.anchor;
        const node = anchor.getNode();
        const isText = $isTextNode(node);

        const text = isText ? node.getTextContent() : "";
        const offset = isText ? anchor.offset : 0;
        const charBefore = offset > 0 ? text[offset - 1] : "";
        const twoBefore = offset > 1 ? text.slice(offset - 2, offset) : "";

        const replacement = getSmartReplacement(event.key, charBefore, twoBefore);
        if (!replacement) return false;

        // Replacements that delete preceding characters need a text node
        if (replacement.deleteCount > 0 && !isText) return false;

        event.preventDefault();

        editor.update(() => {
          if (replacement.deleteCount > 0 && isText) {
            const t = node.getTextContent();
            const o = anchor.offset;
            const newOffset = o - replacement.deleteCount;
            node.setTextContent(t.slice(0, newOffset) + replacement.char + t.slice(o));
            node.select(newOffset + 1, newOffset + 1);
          } else {
            selection.insertRawText(replacement.char);
          }
        });

        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}

function ClickableLinkPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const root = editor.getRootElement();
    if (!root) return;

    const handleClick = (e: MouseEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (href) {
        e.preventDefault();
        window.open(href, "_blank", "noopener");
      }
    };

    root.addEventListener("click", handleClick);
    return () => root.removeEventListener("click", handleClick);
  }, [editor]);

  return null;
}

function AutoFocusPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.focus();
  }, [editor]);

  return null;
}

interface RichTextEditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
  autoFocus?: boolean;
  smartTypography?: boolean;
}

export function RichTextEditor({ initialContent, onChange, autoFocus = true, smartTypography = true }: RichTextEditorProps) {
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
    ],
    editorState: () => {
      $convertFromMarkdownString(initialContent, TRANSFORMERS);
      // Place cursor at end
      $getRoot().selectEnd();
    },
  };

  function handleChange(editorState: EditorState) {
    editorState.read(() => {
      onChange($convertToMarkdownString(TRANSFORMERS));
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
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <TablePlugin />
        <HorizontalRulePlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        {smartTypography && <SmartTypographyPlugin />}
        <ScrollIntoViewPlugin />
        <ClickableLinkPlugin />
        {autoFocus && <AutoFocusPlugin />}
      </div>
    </LexicalComposer>
  );
}
