import { useEffect, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $createParagraphNode,
  $createTextNode,
  TextNode,
  type LexicalNode,
  COMMAND_PRIORITY_HIGH,
  INSERT_LINE_BREAK_COMMAND,
  KEY_DOWN_COMMAND,
  type EditorState,
} from "lexical";
import { ScrollIntoViewPlugin } from "./ScrollIntoViewPlugin";
import { plainTextTheme } from "../lib/editor-theme";
import { parseMarkdownSegments, parseTagLineSegments, type Segment } from "../lib/markdown-highlight";
import { isTagZoneLine } from "../lib/parse-tags";
import { plainifyTypography } from "../lib/plain-typography";

function InitPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      const lines = plainifyTypography(content).split("\n");
      for (const line of lines) {
        const paragraph = $createParagraphNode();
        if (line.length > 0) {
          paragraph.append($createTextNode(line));
        }
        root.append(paragraph);
      }
      root.selectEnd();
    });
  }, [editor, content]);

  return null;
}

function MarkdownShortcutsPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (!(event.metaKey || event.ctrlKey)) return false;

        let wrapper: string | null = null;
        if (event.key === "b") wrapper = "**";
        else if (event.key === "i") wrapper = "_";
        else if (event.key === "k") wrapper = "[";
        else return false;

        event.preventDefault();

        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;

          const text = selection.getTextContent();

          if (wrapper === "[") {
            // Link: [text](url)
            const replacement = text ? `[${text}](url)` : "[](url)";
            selection.insertRawText(replacement);
          } else {
            const replacement = text ? `${wrapper}${text}${wrapper}` : `${wrapper}${wrapper}`;
            selection.insertRawText(replacement);
            // If no text was selected, move cursor between the wrappers
            if (!text) {
              const sel = $getSelection();
              if ($isRangeSelection(sel)) {
                for (let i = 0; i < wrapper.length; i++) {
                  sel.modify("move", false, "character");
                }
              }
            }
          }
        });

        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}

// Matches: "- ", "* ", "+ ", "1. ", "12. ", "- [ ] ", "- [x] ", etc.
const LIST_RE = /^(\s*)([-*+]|(\d+)\.) (\[[ x]\] )?/;

function ListContinuationPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INSERT_LINE_BREAK_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;

        const anchor = selection.anchor;
        const node = anchor.getNode();
        if (!$isTextNode(node)) return false;

        const lineText = node.getTextContent();
        const match = lineText.match(LIST_RE);
        if (!match) return false;

        const [fullMatch, indent, marker, numStr, checkbox] = match;
        const contentAfterMarker = lineText.slice(fullMatch.length);

        // If the line is just the marker with no content, clear the line to break out
        if (contentAfterMarker.trim() === "") {
          node.setTextContent("");
          node.selectEnd();
          return true;
        }

        // Build the next line's prefix
        let nextMarker = marker;
        if (numStr !== undefined) {
          nextMarker = `${parseInt(numStr) + 1}.`;
        }
        const prefix = `${indent}${nextMarker} ${checkbox ? "[ ] " : ""}`;

        // Split text at cursor: keep text before cursor on current line,
        // put text after cursor on new line with the list prefix
        const offset = anchor.offset;
        const before = lineText.slice(0, offset);
        const after = lineText.slice(offset);

        node.setTextContent(before);

        const newParagraph = $createParagraphNode();
        newParagraph.append($createTextNode(prefix + after));
        node.getParentOrThrow().insertAfter(newParagraph);

        // Place cursor right after the prefix on the new line
        const newTextNode = newParagraph.getFirstChild();
        if ($isTextNode(newTextNode)) {
          newTextNode.select(prefix.length, prefix.length);
        }

        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}

// --- Markdown syntax highlighting in plain text mode ---

function segmentsMatchChildren(
  segments: Segment[],
  children: ReturnType<TextNode["getParent"]> extends null ? never : TextNode[],
): boolean {
  if (segments.length !== children.length) return false;
  for (let i = 0; i < segments.length; i++) {
    const child = children[i];
    if (child.getTextContent() !== segments[i].text) return false;
    if (child.getFormat() !== segments[i].format) return false;
    if ((child.getStyle() || "") !== segments[i].style) return false;
  }
  return true;
}

function isInTagZone(parent: LexicalNode): boolean {
  const root = $getRoot();
  const allParagraphs = root.getChildren();
  let headingIdx = -1;

  // Find the first heading-like paragraph (starts with #)
  for (let i = 0; i < allParagraphs.length; i++) {
    if (/^#{1,6}\s+/.test(allParagraphs[i].getTextContent())) {
      headingIdx = i;
      break;
    }
  }

  if (headingIdx === -1) return false;

  // Check if parent is in the tag zone (consecutive tag lines after heading)
  const parentIdx = allParagraphs.indexOf(parent as any);
  if (parentIdx <= headingIdx) return false;

  // Every paragraph between heading+1 and parent must be a tag zone line
  for (let i = headingIdx + 1; i <= parentIdx; i++) {
    if (!isTagZoneLine(allParagraphs[i].getTextContent())) return false;
  }

  return true;
}

function MarkdownHighlightPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node) => {
      const parent = node.getParent();
      if (!parent) return;

      // Gather all text children of the paragraph
      const children = parent.getChildren();
      const textChildren: TextNode[] = [];
      for (const child of children) {
        if ($isTextNode(child)) textChildren.push(child);
        else return; // non-text child, skip
      }

      // Get full paragraph text
      const fullText = textChildren.map((c) => c.getTextContent()).join("");

      // Use tag line segments if in the tag zone, otherwise standard markdown segments
      const segments = isInTagZone(parent) ? parseTagLineSegments(fullText) : parseMarkdownSegments(fullText);

      // Already correct?
      if (segmentsMatchChildren(segments, textChildren)) return;

      // Rebuild: clear all children, insert new ones
      for (const child of textChildren) {
        child.remove();
      }

      for (const seg of segments) {
        const textNode = $createTextNode(seg.text);
        if (seg.format) textNode.setFormat(seg.format);
        if (seg.style) textNode.setStyle(seg.style);
        parent.append(textNode);
      }
    });
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

interface MarkdownEditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
  autoFocus?: boolean;
}

export function MarkdownEditor({ initialContent, onChange, autoFocus = true }: MarkdownEditorProps) {
  const initialConfig = {
    namespace: "markdown-editor",
    theme: plainTextTheme,
    onError: (error: Error) => console.error(error),
  };

  function handleChange(editorState: EditorState) {
    editorState.read(() => {
      onChange($getRoot().getTextContent());
    });
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative min-h-[300px] editor-mono">
        <PlainTextPlugin
          contentEditable={<ContentEditable className="editor-input outline-none caret-accent" />}
          placeholder={
            <div className="editor-placeholder pointer-events-none absolute top-0 left-0 select-none text-text-muted">
              Start writing...
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        <MarkdownShortcutsPlugin />
        <ListContinuationPlugin />
        <MarkdownHighlightPlugin />
        <InitPlugin content={initialContent} />
        <ScrollIntoViewPlugin />
        {autoFocus && <AutoFocusPlugin />}
      </div>
    </LexicalComposer>
  );
}
