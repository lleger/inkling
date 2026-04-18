import { useEffect, useState, useCallback, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type TextFormatType,
} from "lexical";
import { $isHeadingNode } from "@lexical/rich-text";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link,
  Heading1,
  Heading2,
  Heading3,
  Quote,
} from "lucide-react";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $setBlocksType } from "@lexical/selection";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $createParagraphNode } from "lexical";

interface ToolbarButton {
  icon: React.ReactNode;
  title: string;
  action: () => void;
  isActive: boolean;
}

export function FloatingToolbar() {
  const [editor] = useLexicalComposerContext();
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [formats, setFormats] = useState<Set<TextFormatType>>(new Set());
  const [isLink, setIsLink] = useState(false);
  const [blockType, setBlockType] = useState<string>("paragraph");
  const toolbarRef = useRef<HTMLDivElement>(null);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || selection.isCollapsed()) {
      setShow(false);
      return;
    }

    // Get active formats
    const activeFormats = new Set<TextFormatType>();
    if (selection.hasFormat("bold")) activeFormats.add("bold");
    if (selection.hasFormat("italic")) activeFormats.add("italic");
    if (selection.hasFormat("strikethrough")) activeFormats.add("strikethrough");
    if (selection.hasFormat("code")) activeFormats.add("code");
    setFormats(activeFormats);

    // Check if inside a link
    const node = selection.anchor.getNode();
    const parent = node.getParent();
    setIsLink($isLinkNode(parent) || $isLinkNode(node));

    // Check block type
    const anchorNode = selection.anchor.getNode();
    const topLevelElement = anchorNode.getKey() === "root"
      ? anchorNode
      : anchorNode.getTopLevelElementOrThrow();
    if ($isHeadingNode(topLevelElement)) {
      setBlockType(topLevelElement.getTag());
    } else {
      setBlockType(topLevelElement.getType());
    }

    // Position the toolbar
    const nativeSelection = window.getSelection();
    if (!nativeSelection || nativeSelection.rangeCount === 0) return;

    const range = nativeSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setPosition({
      top: rect.top - 48,
      left: rect.left + rect.width / 2,
    });
    setShow(true);
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  // Hide on scroll
  useEffect(() => {
    const hide = () => setShow(false);
    const scrollParent = document.querySelector("[class*='overflow-y']");
    scrollParent?.addEventListener("scroll", hide);
    return () => scrollParent?.removeEventListener("scroll", hide);
  }, []);

  const toggleFormat = useCallback(
    (format: TextFormatType) => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [editor],
  );

  const toggleLink = useCallback(() => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, isLink ? null : "https://");
  }, [editor, isLink]);

  const setHeading = useCallback(
    (tag: "h1" | "h2" | "h3") => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          if (blockType === tag) {
            $setBlocksType(selection, () => $createParagraphNode());
          } else {
            $setBlocksType(selection, () => $createHeadingNode(tag));
          }
        }
      });
    },
    [editor, blockType],
  );

  const setQuote = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (blockType === "quote") {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      }
    });
  }, [editor, blockType]);

  if (!show) return null;

  const buttons: ToolbarButton[] = [
    { icon: <Bold size={14} />, title: "Bold", action: () => toggleFormat("bold"), isActive: formats.has("bold") },
    { icon: <Italic size={14} />, title: "Italic", action: () => toggleFormat("italic"), isActive: formats.has("italic") },
    { icon: <Strikethrough size={14} />, title: "Strikethrough", action: () => toggleFormat("strikethrough"), isActive: formats.has("strikethrough") },
    { icon: <Code size={14} />, title: "Code", action: () => toggleFormat("code"), isActive: formats.has("code") },
    { icon: <Link size={14} />, title: "Link", action: toggleLink, isActive: isLink },
    { icon: <Heading1 size={14} />, title: "Heading 1", action: () => setHeading("h1"), isActive: blockType === "h1" },
    { icon: <Heading2 size={14} />, title: "Heading 2", action: () => setHeading("h2"), isActive: blockType === "h2" },
    { icon: <Heading3 size={14} />, title: "Heading 3", action: () => setHeading("h3"), isActive: blockType === "h3" },
    { icon: <Quote size={14} />, title: "Quote", action: setQuote, isActive: blockType === "quote" },
  ];

  return (
    <div
      ref={toolbarRef}
      className="fixed z-30 flex items-center gap-0.5 rounded-lg border border-border bg-surface shadow-lg px-1 py-0.5 animate-[fade-in_0.1s_ease-out]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {buttons.map((btn, i) => (
        <span key={btn.title} className="contents">
          {i === 5 && <div className="mx-0.5 h-4 w-px bg-border" />}
          <button
            onClick={btn.action}
            title={btn.title}
            className={`flex size-7 items-center justify-center rounded-md transition-colors ${
              btn.isActive
                ? "text-accent bg-accent/10"
                : "text-text-secondary hover:bg-surface-hover hover:text-text"
            }`}
          >
            {btn.icon}
          </button>
        </span>
      ))}
    </div>
  );
}
