import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  INDENT_CONTENT_COMMAND,
  KEY_DOWN_COMMAND,
  OUTDENT_CONTENT_COMMAND,
} from "lexical";
import { $isListItemNode } from "@lexical/list";

export function ListIndentPlugin() {
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
