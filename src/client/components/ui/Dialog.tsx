import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  initialFocus?: BaseDialog.Popup.Props["initialFocus"];
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
  initialFocus,
}: DialogProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="absolute inset-0 z-50 bg-surface-overlay animate-[fade-in_0.1s_ease-out]" />
        <BaseDialog.Viewport className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-3 pt-[max(4rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:pt-[20vh]">
          <BaseDialog.Popup
            initialFocus={initialFocus}
            className={cx(
              "w-full max-w-sm overflow-hidden rounded-xl border border-border bg-surface shadow-2xl animate-[scale-in_0.1s_ease-out]",
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
