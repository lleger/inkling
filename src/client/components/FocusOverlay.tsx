import { useState, useEffect, useCallback, useRef } from "react";

interface FocusOverlayProps {
  onExit: () => void;
}

export function FocusOverlay({ onExit }: FocusOverlayProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBriefly = useCallback(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2000);
  }, []);

  useEffect(() => {
    // Show on mount, then fade out
    showBriefly();

    // Re-show when mouse moves near the top
    const handler = (e: MouseEvent) => {
      if (e.clientY < 50) showBriefly();
    };
    document.addEventListener("mousemove", handler);

    return () => {
      document.removeEventListener("mousemove", handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showBriefly]);

  return (
    <div
      className={`fixed top-3 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <button
        onClick={onExit}
        className="rounded-lg bg-surface-secondary/90 backdrop-blur-sm border border-border px-3 py-1.5 text-[11px] text-text-muted shadow-sm transition-colors hover:text-text-secondary"
      >
        Esc to exit focus mode
      </button>
    </div>
  );
}
