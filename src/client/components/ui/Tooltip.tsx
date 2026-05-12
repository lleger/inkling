import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";

type TooltipProps = {
  label: ReactNode;
  children: ReactElement;
};

export function Tooltip({ label, children }: TooltipProps) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger delay={500} render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side="top" sideOffset={6}>
          <BaseTooltip.Popup className="z-50 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text-secondary shadow-lg animate-[fade-in_0.1s_ease-out]">
            {label}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
