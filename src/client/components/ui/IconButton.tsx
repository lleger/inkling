import { forwardRef, type ComponentProps } from "react";
import { cx } from "../../lib/cx";

type IconButtonProps = ComponentProps<"button"> & {
  buttonSize?: "xs" | "sm" | "md";
  hover?: "text" | "surface";
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { buttonSize = "sm", hover = "surface", className, type = "button", ...props },
  ref,
) {
  const sizeClass = {
    xs: "size-5",
    sm: "size-7",
    md: "size-8",
  }[buttonSize];

  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        "flex items-center justify-center rounded text-text-muted transition-colors",
        sizeClass,
        hover === "surface"
          ? "hover:bg-surface-hover hover:text-text-secondary"
          : "hover:text-text-secondary",
        className,
      )}
      {...props}
    />
  );
});
