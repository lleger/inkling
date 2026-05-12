import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cx } from "../../lib/cx";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label": string;
};

export function Switch({ checked, onCheckedChange, "aria-label": ariaLabel }: SwitchProps) {
  return (
    <BaseSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      nativeButton
      aria-label={ariaLabel}
      render={<button type="button" />}
      className={(state) =>
        cx(
          "relative h-5 w-9 rounded-full transition-colors",
          state.checked ? "bg-accent" : "bg-surface-tertiary",
        )
      }
    >
      <BaseSwitch.Thumb
        className={(state) =>
          cx(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
            state.checked ? "translate-x-4" : "translate-x-0",
          )
        }
      />
    </BaseSwitch.Root>
  );
}
