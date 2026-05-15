import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  maxWidth?: string;
}

export function PageContainer({
  children,
  className,
  maxWidth = "max-w-[680px]",
  ...props
}: PageContainerProps) {
  return (
    <div
      {...props}
      className={cx(
        "flex min-h-full w-full flex-col px-4 pt-16 animate-[fade-in_0.2s_ease-out] sm:px-6 sm:pt-12",
        maxWidth,
        className,
      )}
    >
      {children}
      <div className="h-[calc(6rem_+_env(safe-area-inset-bottom))] shrink-0" aria-hidden />
    </div>
  );
}
