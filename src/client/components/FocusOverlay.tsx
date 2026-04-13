import { useState, useEffect, useRef } from "react";

interface FocusOverlayProps {
  onExit: () => void;
}

export function FocusOverlay({ onExit }: FocusOverlayProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.clientY < 50) {
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setVisible(false), 2000);
      }
    };
    document.addEventListener("mousemove", handler);
    return () => {
      document.removeEventListener("mousemove", handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Show briefly on mount so the user knows how to exit
  useEffect(() => {
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 2000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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
