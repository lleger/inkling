import { forwardRef, type ComponentProps } from "react";
import { cx } from "../../lib/cx";

type TextareaProps = ComponentProps<"textarea">;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cx(
        "w-full resize-y rounded-md border border-border bg-surface-secondary px-2.5 py-1.5 text-[12px] text-text placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20",
        className,
      )}
      {...props}
    />
  );
});
