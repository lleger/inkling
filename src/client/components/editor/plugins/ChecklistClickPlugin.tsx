import { useEffect } from "react";
import { $isListItemNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNearestNodeFromDOMNode } from "lexical";

export function ChecklistClickPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const root = editor.getRootElement();
    if (!root) return;

    const handleClick = (event: MouseEvent) => {
      if (!editor.isEditable()) return;
      if (!(event.target instanceof HTMLElement)) return;

      const listItem = event.target.closest<HTMLLIElement>('li[role="checkbox"]');
      if (!listItem || !root.contains(listItem)) return;

      const rect = listItem.getBoundingClientRect();
      const clickX = event.clientX;
      const nativeCheckboxZone = rect.width > 0 && clickX >= rect.left && clickX <= rect.left + 20;
      if (nativeCheckboxZone) return;

      editor.update(() => {
        const node = $getNearestNodeFromDOMNode(listItem);
        if ($isListItemNode(node)) {
          listItem.focus();
          node.toggleChecked();
        }
      });
    };

    root.addEventListener("click", handleClick);
    return () => root.removeEventListener("click", handleClick);
  }, [editor]);

  return null;
}
