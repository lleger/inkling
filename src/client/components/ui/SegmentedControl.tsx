import type { ReactNode } from "react";
import { cx } from "../../lib/cx";

type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: readonly SegmentedControlOption<T>[];
  onValueChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onValueChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex gap-1 rounded-md bg-surface-secondary p-0.5 border border-border">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onValueChange(option.value)}
          className={cx(
            "flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 text-[12px] font-medium transition-all",
            value === option.value
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text-secondary",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
