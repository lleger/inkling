import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TextNode } from "lexical";
import { $isListItemNode, $isListNode } from "@lexical/list";

export function ChecklistShortcutPlugin() {
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
