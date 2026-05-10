import { useEffect } from "react";
import { $isListItemNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNearestNodeFromDOMNode } from "lexical";

const CHECKBOX_HIT_ZONE_PX = 20;

export function ChecklistHitZonePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const root = editor.getRootElement();
    if (!root) return;

    const isCheckboxHit = (event: MouseEvent) => {
      if (!(event.target instanceof HTMLElement)) return null;

      const listItem = event.target.closest<HTMLLIElement>('li[role="checkbox"]');
      if (!listItem || !root.contains(listItem)) return null;

      const rect = listItem.getBoundingClientRect();
      const isInHitZone =
        event.clientX >= rect.left && event.clientX <= rect.left + CHECKBOX_HIT_ZONE_PX;
      return isInHitZone ? listItem : null;
    };

    const handlePointerDown = (event: MouseEvent) => {
      if (isCheckboxHit(event)) {
        event.preventDefault();
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (!editor.isEditable()) return;

      const listItem = isCheckboxHit(event);
      if (!listItem) return;

      event.preventDefault();
      event.stopPropagation();

      editor.update(() => {
        const node = $getNearestNodeFromDOMNode(listItem);
        if ($isListItemNode(node)) {
          listItem.focus();
          node.toggleChecked();
        }
      });
    };

    root.addEventListener("pointerdown", handlePointerDown, true);
    root.addEventListener("click", handleClick, true);
    return () => {
      root.removeEventListener("pointerdown", handlePointerDown, true);
      root.removeEventListener("click", handleClick, true);
    };
  }, [editor]);

  return null;
}
