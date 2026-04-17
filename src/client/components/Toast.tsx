import { useEffect, useState } from "react";
import { X } from "lucide-react";

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
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border border-border bg-surface-secondary shadow-lg px-4 py-2.5 text-sm text-text transition-all duration-200 ${
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
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onDismiss, 200);
        }}
        className="flex size-5 items-center justify-center rounded text-text-muted hover:text-text-secondary"
      >
        <X size={12} />
      </button>
    </div>
  );
}
