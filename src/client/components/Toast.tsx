import { Toast as BaseToast } from "@base-ui/react/toast";
import { X } from "lucide-react";
import { cx } from "../lib/cx";
import { IconButton } from "./ui/IconButton";

export type ToastAction = { label: string; onClick: () => void };
export type ToastData = { action?: ToastAction };

export function ToastViewport() {
  const { close, toasts } = BaseToast.useToastManager<ToastData>();

  return (
    <BaseToast.Portal>
      <BaseToast.Viewport className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-col items-center gap-2 sm:bottom-6">
        {toasts.map((toast) => (
          <BaseToast.Root
            key={toast.id}
            toast={toast}
            swipeDirection="down"
            className={(state) =>
              cx(
                "flex items-center gap-3 rounded-lg border border-border bg-surface-secondary px-4 py-2.5 text-sm text-text shadow-lg transition-all duration-200",
                state.transitionStatus === "ending"
                  ? "translate-y-2 opacity-0"
                  : "translate-y-0 opacity-100",
              )
            }
          >
            <BaseToast.Content className="flex items-center gap-3">
              <BaseToast.Description>{toast.description}</BaseToast.Description>
              {toast.data?.action && (
                <BaseToast.Action
                  onClick={() => {
                    toast.data?.action?.onClick();
                    close(toast.id);
                  }}
                  className="font-medium text-accent hover:underline"
                >
                  {toast.data.action.label}
                </BaseToast.Action>
              )}
              <BaseToast.Close
                render={
                  <IconButton buttonSize="xs" hover="text" aria-label="Dismiss toast">
                    <X size={12} />
                  </IconButton>
                }
              />
            </BaseToast.Content>
          </BaseToast.Root>
        ))}
      </BaseToast.Viewport>
    </BaseToast.Portal>
  );
}
