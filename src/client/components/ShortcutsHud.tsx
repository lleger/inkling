import { X } from "lucide-react";
import { Dialog, DialogClose } from "./ui/Dialog";

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
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title="Keyboard Shortcuts"
      placement="center"
      size="xs"
      className="sm:rounded-lg sm:shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-xs font-semibold text-text">Keyboard Shortcuts</span>
        <DialogClose className="flex size-5 items-center justify-center rounded text-text-muted hover:bg-surface-hover hover:text-text-secondary">
          <X size={12} />
        </DialogClose>
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
    </Dialog>
  );
}
