import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { cx } from "../../lib/cx";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  placement?: "top" | "center";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  contentClassName?: string;
  initialFocus?: BaseDialog.Popup.Props["initialFocus"];
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  placement = "top",
  size = "sm",
  className,
  contentClassName,
  initialFocus,
}: DialogProps) {
  const placementClass =
    placement === "center"
      ? "items-end sm:items-center sm:py-[max(0.75rem,env(safe-area-inset-top))]"
      : "items-end sm:items-start sm:pt-[20vh]";
  const sizeClass = {
    xs: "sm:max-w-80",
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
  }[size];

  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="absolute inset-0 z-50 bg-surface-overlay animate-[fade-in_0.1s_ease-out]" />
        <BaseDialog.Viewport
          className={cx(
            "fixed inset-0 z-50 flex justify-center overflow-y-auto px-0 pt-[max(4rem,env(safe-area-inset-top))] pb-0 sm:px-3 sm:pb-[max(1rem,env(safe-area-inset-bottom))]",
            placementClass,
          )}
        >
          <BaseDialog.Popup
            initialFocus={initialFocus}
            className={cx(
              "w-full max-h-[calc(100dvh-1rem)] overflow-hidden rounded-t-xl border border-b-0 border-border bg-surface shadow-2xl animate-[scale-in_0.1s_ease-out] sm:max-h-none sm:rounded-xl sm:border",
              sizeClass,
              className,
            )}
          >
            <BaseDialog.Title className="sr-only">{title}</BaseDialog.Title>
            {description && (
              <BaseDialog.Description className="sr-only">{description}</BaseDialog.Description>
            )}
            <div className={contentClassName}>{children}</div>
            {footer && <div className="border-t border-border">{footer}</div>}
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

export const DialogClose = BaseDialog.Close;
