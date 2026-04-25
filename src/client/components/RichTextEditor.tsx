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
import { INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HashtagNode, $createHashtagNode } from "@lexical/hashtag";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $createTextNode,
  $isParagraphNode,
  TextNode,
  COMMAND_PRIORITY_HIGH,
  COPY_COMMAND,
  KEY_DOWN_COMMAND,
  createEditor,
  type EditorState,
  type LexicalNode,
} from "lexical";
import { $isHeadingNode } from "@lexical/rich-text";
import { $isListItemNode, $isListNode } from "@lexical/list";
import { $generateJSONFromSelectedNodes } from "@lexical/clipboard";
import { ScrollIntoViewPlugin } from "./ScrollIntoViewPlugin";
import { FloatingToolbar } from "./FloatingToolbar";
import { richTextTheme } from "../lib/editor-theme";
import { TRANSFORMERS } from "../lib/markdown-transformers";
import { normalizeMarkdown } from "../lib/normalize-markdown";
import { getSmartReplacement } from "../lib/smart-typography";
import { isTagZoneLine } from "../lib/parse-tags";

const TAG_TOKEN_RE = /#([a-zA-Z0-9_-]+)/g;

function TagZonePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.update(() => {
        const root = $getRoot();
        const children = root.getChildren();
        let inTagZone = false;
        let pastTagZone = false;

        for (const child of children) {
          // Find the first heading
          if (!inTagZone && !pastTagZone && $isHeadingNode(child)) {
            inTagZone = true;
            continue;
          }

          if (!$isParagraphNode(child)) {
            if (inTagZone) pastTagZone = true;
            inTagZone = false;
            // Convert any hashtag nodes in non-tag-zone to plain text
            convertHashtagsToText(child);
            continue;
          }

          const text = child.getTextContent();

          if (inTagZone && !pastTagZone && isTagZoneLine(text)) {
            // This is a tag zone paragraph — convert text to hashtag nodes
            convertTextToHashtags(child);
          } else {
            if (inTagZone) pastTagZone = true;
            inTagZone = false;
            // Convert any hashtag nodes back to plain text
            convertHashtagsToText(child);
          }
        }
      });
    });
  }, [editor]);

  return null;
}

function convertTextToHashtags(paragraph: LexicalNode) {
  if (!$isParagraphNode(paragraph)) return;
  const children = paragraph.getChildren();
  for (const child of children) {
    if (child.getType() === "hashtag") continue;
    if (!$isTextNode(child)) continue;

    const text = child.getTextContent();
    const parts: { text: string; isTag: boolean }[] = [];
    let lastIndex = 0;

    TAG_TOKEN_RE.lastIndex = 0;
    let match;
    while ((match = TAG_TOKEN_RE.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), isTag: false });
      }
      parts.push({ text: match[0], isTag: true });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isTag: false });
    }

    if (parts.length <= 1 && !parts[0]?.isTag) continue;

    const nodes: LexicalNode[] = [];
    for (const part of parts) {
      if (part.isTag) {
        nodes.push($createHashtagNode(part.text));
      } else {
        nodes.push($createTextNode(part.text));
      }
    }

    for (const node of nodes) {
      child.insertBefore(node);
    }
    child.remove();
  }
}

function convertHashtagsToText(node: LexicalNode) {
  const children = "getChildren" in node ? (node as any).getChildren() : [];
  for (const child of children) {
    if (child.getType() === "hashtag") {
      const textNode = $createTextNode(child.getTextContent());
      child.replace(textNode);
    }
  }
}

function ListIndentPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (event.key !== "Tab") return false;

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        const node = selection.anchor.getNode();
        const listItem = $isListItemNode(node) ? node : node.getParent();
        if (!listItem || !$isListItemNode(listItem)) return false;

        event.preventDefault();

        if (event.shiftKey) {
          editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
        } else {
          editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
        }

        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}

function ChecklistShortcutPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node) => {
      const text = node.getTextContent();
      const match = text.match(/^\[( |x)\] /);
      if (!match) return;

      const listItem = node.getParent();
      if (!listItem || !$isListItemNode(listItem)) return;

      const listNode = listItem.getParent();
      if (!listNode || !$isListNode(listNode)) return;

      // Already a check list — don't re-trigger
      if (listNode.getListType() === "check") return;

      const isChecked = match[1] === "x";

      // Remove the [ ] / [x] prefix from the text
      editor.update(() => {
        node.setTextContent(text.slice(match[0].length));
        listNode.setListType("check");
        listItem.setChecked(isChecked);
        // Place cursor at start of remaining text
        node.select(0, 0);
      });
    });
  }, [editor]);

  return null;
}

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

function CopyAsMarkdownPlugin() {
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
        const json = $generateJSONFromSelectedNodes(editor, selection);

        // Inline-only selections (within a single paragraph) come back as text/link
        // nodes which can't be root-level. Wrap them in a paragraph.
        const ELEMENT_OR_DECORATOR_TYPES = new Set([
          "paragraph", "heading", "quote", "list", "code", "table", "horizontalrule",
        ]);
        const wrappedChildren = (json.nodes as any[]).every(
          (n) => ELEMENT_OR_DECORATOR_TYPES.has(n.type),
        )
          ? json.nodes
          : [{
              type: "paragraph",
              version: 1,
              direction: null,
              format: "",
              indent: 0,
              children: json.nodes,
            }];

        const headless = createEditor({
          namespace: "writer-copy",
          nodes: [
            HeadingNode, QuoteNode,
            ListNode, ListItemNode,
            CodeNode, CodeHighlightNode,
            LinkNode, AutoLinkNode,
            TableNode, TableRowNode, TableCellNode,
            HashtagNode, HorizontalRuleNode,
          ],
        });
        const state = headless.parseEditorState({
          root: {
            type: "root",
            children: wrappedChildren,
            direction: null,
            format: "",
            indent: 0,
            version: 1,
          },
        } as any);
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
      HashtagNode,
    ],
    editorState: () => {
      $convertFromMarkdownString(initialContent, TRANSFORMERS);
      // Place cursor at end
      $getRoot().selectEnd();
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
        <TablePlugin />
        <HorizontalRulePlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        {smartTypography && <SmartTypographyPlugin />}
        <TagZonePlugin />
        <ChecklistShortcutPlugin />
        <FloatingToolbar />
        <ScrollIntoViewPlugin />
        <ClickableLinkPlugin />
        <CopyAsMarkdownPlugin />
        {autoFocus && <AutoFocusPlugin />}
      </div>
    </LexicalComposer>
  );
}
