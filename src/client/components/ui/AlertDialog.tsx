import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { IconButton } from "./IconButton";

type AlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  confirmPending?: boolean;
  pendingLabel?: string;
  destructive?: boolean;
};

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  cancelLabel = "Cancel",
  confirmPending = false,
  pendingLabel,
  destructive = false,
}: AlertDialogProps) {
  return (
    <BaseAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseAlertDialog.Portal>
        <BaseAlertDialog.Backdrop className="fixed inset-0 z-50 bg-surface-overlay animate-[fade-in_0.1s_ease-out]" />
        <BaseAlertDialog.Viewport className="fixed inset-0 z-50 flex items-end justify-center px-0 pt-[max(4rem,env(safe-area-inset-top))] pb-0 sm:items-center sm:px-3 sm:py-[max(0.75rem,env(safe-area-inset-top))]">
          <BaseAlertDialog.Popup className="w-full max-h-[calc(100dvh-1rem)] overflow-hidden rounded-t-xl border border-b-0 border-border bg-surface shadow-2xl animate-[scale-in_0.1s_ease-out] sm:max-w-sm sm:rounded-xl sm:border">
            <div className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <BaseAlertDialog.Title className="text-sm font-semibold text-text">
                    {title}
                  </BaseAlertDialog.Title>
                  <BaseAlertDialog.Description className="mt-1 text-xs leading-relaxed text-text-muted">
                    {description}
                  </BaseAlertDialog.Description>
                </div>
                <BaseAlertDialog.Close
                  render={<IconButton buttonSize="xs" aria-label={cancelLabel} />}
                >
                  <X size={12} />
                </BaseAlertDialog.Close>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-3">
              <BaseAlertDialog.Close className="rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text">
                {cancelLabel}
              </BaseAlertDialog.Close>
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirmPending}
                className={cx(
                  "rounded-md px-3 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
                  destructive ? "bg-red-600 text-white" : "bg-accent text-white",
                )}
              >
                {confirmPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
              </button>
            </div>
          </BaseAlertDialog.Popup>
        </BaseAlertDialog.Viewport>
      </BaseAlertDialog.Portal>
    </BaseAlertDialog.Root>
  );
}
