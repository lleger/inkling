import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export function ScrollIntoViewPlugin() {
  const [editor] = useLexicalComposerContext();
  const disposedRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;

    const unregister = editor.registerUpdateListener(({ tags }) => {
      // Skip the initial load to avoid jumping on mount
      if (tags.has("history-merge")) return;

      requestAnimationFrame(() => {
        if (disposedRef.current) return;

        try {
          const root = editor.getRootElement();
          if (!root) return;

          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return;

          const range = sel.getRangeAt(0);
          if (!root.contains(range.startContainer)) return;

          const rect = range.getBoundingClientRect();
          const scrollParent = root.closest("[class*='overflow-y']") as HTMLElement | null;
          if (!scrollParent) return;

          const parentRect = scrollParent.getBoundingClientRect();
          const threshold = parentRect.bottom - parentRect.height * 0.4;

          if (rect.bottom > threshold) {
            scrollParent.scrollBy({
              top: rect.bottom - threshold + 20,
              behavior: "smooth",
            });
          }
        } catch {
          // DOM may be gone during cleanup
        }
      });
    });

    return () => {
      disposedRef.current = true;
      unregister();
    };
  }, [editor]);

  return null;
}
