import { Toast as BaseToast } from "@base-ui/react/toast";
import { X } from "lucide-react";
import type { CSSProperties } from "react";
import { cx } from "../lib/cx";
import { IconButton } from "./ui/IconButton";

export type ToastAction = { label: string; onClick: () => void };
export type ToastData = { action?: ToastAction };

interface ToastViewportProps {
  hostedInSidebar: boolean;
  sidebarWidth: number;
}

export function ToastViewport({ hostedInSidebar, sidebarWidth }: ToastViewportProps) {
  const { close, toasts } = BaseToast.useToastManager<ToastData>();

  return (
    <BaseToast.Portal>
      <BaseToast.Viewport
        style={{ "--toast-sidebar-width": `${sidebarWidth}px` } as CSSProperties}
        className={cx(
          "fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-col items-center gap-2 sm:bottom-6",
          hostedInSidebar &&
            "lg:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:left-3 lg:w-[calc(var(--toast-sidebar-width)-1.5rem)] lg:max-w-[calc(100vw-1.5rem)] lg:translate-x-0 lg:items-stretch",
        )}
      >
        {toasts.map((toast) => (
          <BaseToast.Root
            key={toast.id}
            toast={toast}
            swipeDirection="down"
            className={(state) =>
              cx(
                "toast-card flex items-center gap-3 rounded-xl bg-surface px-3.5 py-2.5 text-sm text-text shadow-xl ring-1 ring-border/80 backdrop-blur-sm",
                hostedInSidebar ? "lg:w-full" : "",
                state.transitionStatus === "starting" && "toast-card-enter",
                state.transitionStatus === "ending" && "toast-card-exit",
                state.limited && "hidden",
              )
            }
          >
            <BaseToast.Content className="flex min-w-0 items-center gap-3">
              <BaseToast.Description className="min-w-0 flex-1 text-balance">
                {toast.description}
              </BaseToast.Description>
              {toast.data?.action && (
                <BaseToast.Action
                  onClick={() => {
                    toast.data?.action?.onClick();
                    close(toast.id);
                  }}
                  className="shrink-0 font-medium text-accent hover:underline"
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
