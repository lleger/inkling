import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  $isTextNode,
  type LexicalNode,
} from "lexical";
import { $isHeadingNode } from "@lexical/rich-text";
import { $createHashtagNode } from "@lexical/hashtag";
import { isTagZoneLine } from "../../../lib/parse-tags";

const TAG_TOKEN_RE = /#([a-zA-Z0-9_-]+)/g;

function hasChildren(
  node: LexicalNode,
): node is LexicalNode & { getChildren: () => LexicalNode[] } {
  return "getChildren" in node && typeof node.getChildren === "function";
}

export function TagZonePlugin() {
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
  const children = hasChildren(node) ? node.getChildren() : [];
  for (const child of children) {
    if (child.getType() === "hashtag") {
      const textNode = $createTextNode(child.getTextContent());
      child.replace(textNode);
    }
  }
}
