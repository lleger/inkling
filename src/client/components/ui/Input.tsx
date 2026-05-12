import { forwardRef, type ComponentProps } from "react";
import { cx } from "../../lib/cx";

type InputProps = ComponentProps<"input"> & {
  variant?: "field" | "ghost";
  inputSize?: "sm" | "md";
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { variant = "field", inputSize = "sm", className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cx(
        "text-text placeholder:text-text-muted outline-none",
        variant === "field" &&
          "w-full rounded-md border border-border bg-surface-secondary transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20",
        variant === "ghost" && "flex-1 bg-transparent",
        inputSize === "sm" ? "px-2.5 py-1.5 text-[12px]" : "text-sm",
        variant === "ghost" && "px-0 py-0",
        className,
      )}
      {...props}
    />
  );
});
