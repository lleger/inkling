import { useEffect } from "react";
import { X } from "lucide-react";

interface ShortcutsHudProps {
  open: boolean;
  onClose: () => void;
}

const MOD = navigator.platform.includes("Mac") ? "\u2318" : "Ctrl+";
const SHIFT = "\u21E7";

const shortcuts = [
  { keys: `${MOD}K`, desc: "Command palette" },
  { keys: `${MOD}${SHIFT}N`, desc: "New note" },
  { keys: `${MOD}${SHIFT}M`, desc: "Toggle mode" },
  { keys: `${MOD}${SHIFT}S`, desc: "Toggle sidebar" },
  { keys: `${MOD}${SHIFT}F`, desc: "Focus mode" },
  { keys: `${MOD}/`, desc: "Shortcuts" },
  { keys: "", desc: "" },
  { keys: `${MOD}B`, desc: "Bold", context: "markdown" },
  { keys: `${MOD}I`, desc: "Italic", context: "markdown" },
  { keys: `${MOD}K`, desc: "Link", context: "markdown" },
];

export function ShortcutsHud({ open, onClose }: ShortcutsHudProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay animate-[fade-in_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-72 rounded-lg border border-border bg-surface shadow-xl animate-[scale-in_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-xs font-semibold text-text">Keyboard Shortcuts</span>
          <button
            className="flex size-5 items-center justify-center rounded text-text-muted hover:bg-surface-hover hover:text-text-secondary"
            onClick={onClose}
          >
            <X size={12} />
          </button>
        </div>
        <div className="py-1.5">
          {shortcuts.map((s, i) =>
            s.keys === "" ? (
              <div key={i} className="mx-4 my-1 h-px bg-border" />
            ) : (
              <div key={i} className="flex items-center justify-between px-4 py-1">
                <span className="flex items-center gap-1.5 text-[13px] text-text-secondary">
                  {s.desc}
                  {s.context && (
                    <span className="rounded bg-surface-tertiary px-1 py-px text-[10px] text-text-muted">
                      {s.context}
                    </span>
                  )}
                </span>
                <kbd className="rounded border border-border bg-surface-secondary px-1.5 py-0.5 text-[11px] font-medium text-text-muted">
                  {s.keys}
                </kbd>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
