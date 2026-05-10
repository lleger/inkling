import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
} from "lexical";
import { getSmartReplacement } from "../../../lib/smart-typography";

export function SmartTypographyPlugin() {
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
