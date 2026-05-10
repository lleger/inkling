import { useEffect, useMemo, useRef, useState } from "react";
import { Folder, Smile, X } from "lucide-react";
import { COMMON_FOLDER_EMOJIS, LUCIDE_FOLDER_ICONS } from "../lib/folder-icons";
import type { FolderIconType, FolderMetadata } from "../types";

interface FolderIconPickerModalProps {
  open: boolean;
  folderPath: string | null;
  current: FolderMetadata | undefined;
  onClose: () => void;
  onSave: (icon: { icon_type: FolderIconType; icon_value: string } | null) => void;
}

export function FolderIconPickerModal({
  open,
  folderPath,
  current,
  onClose,
  onSave,
}: FolderIconPickerModalProps) {
  const [emoji, setEmoji] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setEmoji(current?.icon_type === "emoji" ? current.icon_value : "");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [current, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const selectedKey = useMemo(
    () => (current ? `${current.icon_type}:${current.icon_value}` : "default"),
    [current],
  );

  if (!open || !folderPath) return null;

  const saveEmoji = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave({ icon_type: "emoji", icon_value: [...trimmed][0] });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-surface-overlay px-3 pt-[max(4rem,env(safe-area-inset-top))] animate-[fade-in_0.1s_ease-out] sm:pt-[18vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-2xl animate-[scale-in_0.1s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Folder size={15} className="shrink-0 text-text-muted" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-text">Customize folder icon</div>
            <div className="truncate text-xs text-text-muted">{folderPath}</div>
          </div>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded text-text-muted hover:bg-surface-hover hover:text-text-secondary"
            title="Close"
          >
            <X size={13} />
          </button>
        </div>

        <div className="max-h-[min(28rem,65dvh)] overflow-y-auto p-3">
          <div className="mb-4 rounded-lg border border-border bg-surface-secondary p-2">
            <label className="mb-2 flex items-center gap-2 text-xs font-medium text-text-secondary">
              <Smile size={13} />
              Custom emoji
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEmoji(emoji);
                }}
                maxLength={8}
                placeholder="Paste an emoji"
                className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
              />
              <button
                onClick={() => saveEmoji(emoji)}
                disabled={!emoji.trim()}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="mb-2 text-xs font-medium text-text-secondary">Emoji</div>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
              {COMMON_FOLDER_EMOJIS.map((value) => (
                <button
                  key={value}
                  onClick={() => onSave({ icon_type: "emoji", icon_value: value })}
                  className={`flex aspect-square items-center justify-center rounded-lg border text-xl transition-colors ${
                    selectedKey === `emoji:${value}`
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface-secondary hover:bg-surface-hover"
                  }`}
                  title={value}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-text-secondary">Icons</div>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {LUCIDE_FOLDER_ICONS.map(({ name, label, Icon }) => (
                <button
                  key={name}
                  onClick={() => onSave({ icon_type: "lucide", icon_value: name })}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border px-1 text-[10px] transition-colors ${
                    selectedKey === `lucide:${name}`
                      ? "border-accent bg-accent/10 text-text"
                      : "border-border bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:text-text"
                  }`}
                  title={label}
                >
                  <Icon size={16} />
                  <span className="max-w-full truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <button
            onClick={() => onSave(null)}
            className="rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
          >
            Reset to folder icon
          </button>
          <span className="text-[10px] text-text-muted">Esc closes</span>
        </div>
      </div>
    </div>
  );
}
