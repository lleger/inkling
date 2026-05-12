import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { IconButton } from "./ui/IconButton";

interface ToastProps {
  message: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
  onDismiss: () => void;
}

export function Toast({ message, action, duration = 5000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 200); // wait for fade-out
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-surface-secondary px-4 py-2.5 text-sm text-text shadow-lg transition-all duration-200 sm:bottom-6 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <span>{message}</span>
      {action && (
        <button
          onClick={() => {
            action.onClick();
            onDismiss();
          }}
          className="font-medium text-accent hover:underline"
        >
          {action.label}
        </button>
      )}
      <IconButton
        buttonSize="xs"
        hover="text"
        onClick={() => {
          setVisible(false);
          setTimeout(onDismiss, 200);
        }}
        aria-label="Dismiss toast"
      >
        <X size={12} />
      </IconButton>
    </div>
  );
}
