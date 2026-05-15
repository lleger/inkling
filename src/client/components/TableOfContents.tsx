import { Drawer } from "@base-ui/react/drawer";
import { FileText, ListTree, X } from "lucide-react";
import { cx } from "../lib/cx";
import type { TocHeading } from "../lib/table-of-contents";
import { IconButton } from "./ui/IconButton";

interface TableOfContentsProps {
  headings: TocHeading[];
  activeHeadingId: string | null;
  onSelect: (heading: TocHeading) => void;
}

interface TableOfContentsDrawerProps extends TableOfContentsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TableOfContentsDrawer({
  headings,
  activeHeadingId,
  onSelect,
  open,
  onOpenChange,
}: TableOfContentsDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="down">
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-surface-overlay animate-[fade-in_0.1s_ease-out] xl:hidden" />
        <Drawer.Viewport className="pointer-events-none fixed inset-0 z-40 flex items-end justify-center xl:items-stretch xl:justify-end">
          <Drawer.Popup className="meta-panel-drawer pointer-events-auto flex max-h-[min(80dvh,34rem)] w-full flex-col rounded-t-xl border border-b-0 border-border bg-surface shadow-2xl xl:h-full xl:max-h-none xl:w-[min(100vw,22rem)] xl:rounded-none xl:border-y-0 xl:border-r-0 xl:border-l xl:shadow-lg">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <Drawer.Title className="flex items-center gap-2 text-sm font-semibold text-text">
                <ListTree size={15} className="text-text-muted" />
                Outline
              </Drawer.Title>
              <Drawer.Close
                render={<IconButton buttonSize="sm" aria-label="Close outline" title="Close" />}
              >
                <X size={15} />
              </Drawer.Close>
            </header>

            <Drawer.Content className="flex-1 overflow-y-auto px-4 py-3">
              {headings.length > 0 ? (
                <OutlineList
                  headings={headings}
                  activeHeadingId={activeHeadingId}
                  onSelect={(heading) => {
                    onSelect(heading);
                    onOpenChange(false);
                  }}
                />
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-base/7 text-text-muted sm:text-sm/6">
                  <FileText size={16} />
                  Add headings to build an outline.
                </div>
              )}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function OutlineList({ headings, activeHeadingId, onSelect }: TableOfContentsProps) {
  return (
    <nav className="space-y-0.5" aria-label="Headings">
      {headings.map((heading) => (
        <button
          key={heading.id}
          type="button"
          onClick={() => onSelect(heading)}
          className={cx(
            "block w-full rounded-md py-1.5 pr-2 text-left text-base/7 text-text-muted sm:text-[12px]/5",
            "hover:bg-surface-hover hover:text-text-secondary",
            activeHeadingId === heading.id && "bg-accent/10 text-accent hover:text-accent",
          )}
          style={{ paddingLeft: `${Math.min(heading.level - 1, 3) * 0.75 + 0.5}rem` }}
        >
          <span className="line-clamp-2">{heading.text}</span>
        </button>
      ))}
    </nav>
  );
}
