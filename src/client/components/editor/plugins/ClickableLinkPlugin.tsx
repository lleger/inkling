import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export function ClickableLinkPlugin() {
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
