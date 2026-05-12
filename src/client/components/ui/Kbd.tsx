import type { ComponentProps } from "react";
import { cx } from "../../lib/cx";

type KbdProps = ComponentProps<"kbd"> & {
  size?: "xs" | "sm";
};

export function Kbd({ size = "sm", className, ...props }: KbdProps) {
  return (
    <kbd
      className={cx(
        "rounded border border-border bg-surface-secondary font-medium text-text-muted",
        size === "xs" ? "px-1 py-px text-[10px]" : "px-1.5 py-0.5 text-[11px]",
        className,
      )}
      {...props}
    />
  );
}
