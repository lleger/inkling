import { Popover as BasePopover } from "@base-ui/react/popover";
import { Menu } from "@base-ui/react/menu";
import { Separator } from "@base-ui/react/separator";
import { Toolbar } from "@base-ui/react/toolbar";
import { type CSSProperties, type ReactNode, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code,
  Columns2,
  Info,
  ListTree,
  LoaderCircle,
  Maximize,
  Paperclip,
  Type,
} from "lucide-react";
import { addDays, dailyLabel, dailyTitle, isAfterDay } from "../lib/daily-notes";
import type { EditorMode, SaveStatus } from "../types";

type SaveStatusMeta = {
  label: string;
  shortLabel: string;
  textClassName: string;
  dotClassName: string;
};

interface EditorStatusLineProps {
  focusMode: boolean;
  editorMode: EditorMode;
  setModeTo: (mode: EditorMode) => void;
  saveStatus: SaveStatus;
  saveMeta: SaveStatusMeta;
  savedPulseKey: number;
  wordCount: number;
  taskStats: { done: number; total: number } | null;
  onClearDoneTasks: () => void;
  metaPanelOpen: boolean;
  onToggleMetaPanel: () => void;
  showOutline: boolean;
  outlineOpen: boolean;
  onOpenOutline: () => void;
  onEnterFocusMode: () => void;
  dailyDate: Date | null;
  canOpenNextDailyDate: boolean;
  onOpenDailyNote: (date?: Date) => void;
  openFilePicker: () => void;
  uploading: boolean;
  mainInsetLeft: number;
}

export function EditorStatusLine({
  focusMode,
  editorMode,
  setModeTo,
  saveStatus,
  saveMeta,
  savedPulseKey,
  wordCount,
  taskStats,
  onClearDoneTasks,
  metaPanelOpen,
  onToggleMetaPanel,
  showOutline,
  outlineOpen,
  onOpenOutline,
  onEnterFocusMode,
  dailyDate,
  canOpenNextDailyDate,
  onOpenDailyNote,
  openFilePicker,
  uploading,
  mainInsetLeft,
}: EditorStatusLineProps) {
  const wordLabel = `${wordCount.toLocaleString()} ${wordCount === 1 ? "word" : "words"}`;
  const overlayStyle = { "--status-main-left": `${mainInsetLeft}px` } as CSSProperties;

  return (
    <div
      className={`pointer-events-none fixed inset-y-0 right-0 left-0 z-10 flex justify-center transition-[left,opacity] duration-200 ease-out lg:left-[var(--status-main-left)] ${focusMode ? "opacity-0" : "opacity-100"}`}
      style={overlayStyle}
      aria-label="Editor statusline"
    >
      <div className="pointer-events-none relative h-full w-full">
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex h-12 items-center gap-1 overflow-x-auto border-t border-border bg-surface-secondary px-1 py-1 text-[11px] text-text-muted select-none sm:gap-1.5">
          <div className="flex min-w-0 flex-none items-center gap-1.5 sm:flex-1 sm:gap-2">
            <span
              className={`inline-flex w-[4.5rem] shrink-0 items-center justify-end gap-1.5 ${saveMeta.textClassName}`}
              title={saveMeta.label}
            >
              <span
                key={savedPulseKey}
                className={`size-1.5 rounded-full ${saveMeta.dotClassName} ${savedPulseKey > 0 && saveStatus === "saved" ? "motion-save-success" : ""}`}
              />
              {saveMeta.shortLabel}
            </span>
            <StatusMetaSeparator />
            <span
              className={`shrink-0 ${wordCount > 10000 ? "text-accent" : ""}`}
              title={wordCount > 10000 ? "Large note" : wordLabel}
            >
              <span className="sm:hidden">{wordCount.toLocaleString()}w</span>
              <span className="hidden sm:inline">
                {wordLabel}
                {wordCount > 10000 ? " · large" : ""}
              </span>
            </span>
            {taskStats && (
              <>
                <StatusDivider />
                {taskStats.done > 0 ? (
                  <button
                    onClick={onClearDoneTasks}
                    className="shrink-0 rounded px-1 py-0.5 hover:bg-surface-hover hover:text-text-secondary"
                    title="Clear done tasks"
                  >
                    {taskStats.done}/{taskStats.total} tasks
                  </button>
                ) : (
                  <span className="shrink-0">
                    {taskStats.done}/{taskStats.total} tasks
                  </span>
                )}
              </>
            )}
          </div>

          <div className="hidden min-w-0 flex-1 justify-center sm:flex">
            {dailyDate && (
              <div className="inline-flex shrink-0 items-center gap-0.5">
                <PlainStatusButton
                  onClick={() => onOpenDailyNote(addDays(dailyDate, -1))}
                  title="Open previous day"
                >
                  <ChevronLeft size={13} />
                </PlainStatusButton>
                <DailyDatePicker date={dailyDate} onSelect={onOpenDailyNote} />
                <PlainStatusButton
                  onClick={() => onOpenDailyNote(addDays(dailyDate, 1))}
                  disabled={!canOpenNextDailyDate}
                  title="Open next day"
                >
                  <ChevronRight size={13} />
                </PlainStatusButton>
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 justify-end">
            <Toolbar.Root
              orientation="horizontal"
              className="flex shrink-0 items-center gap-1"
              aria-label="Editor controls"
            >
              <ModeMenu current={editorMode} onSelect={setModeTo} />

              <Toolbar.Group className="hidden shrink-0 items-center gap-0.5 rounded-md bg-surface/70 p-0.5 sm:flex">
                <ModeButton
                  mode="richtext"
                  current={editorMode}
                  onClick={setModeTo}
                  title="Rich Text"
                  icon={<Type size={14} />}
                  label="RT"
                />
                <ModeButton
                  mode="markdown"
                  current={editorMode}
                  onClick={setModeTo}
                  title="Markdown"
                  icon={<Code size={14} />}
                  label="MD"
                />
                <ModeButton
                  mode="split"
                  current={editorMode}
                  onClick={setModeTo}
                  title="Split View"
                  icon={<Columns2 size={14} />}
                  label="SP"
                />
              </Toolbar.Group>

              <Toolbar.Separator
                orientation="vertical"
                className="mx-1 h-5 w-px shrink-0 bg-border"
              />

              <Toolbar.Group className="flex shrink-0 items-center gap-0.5">
                <StatusButton onClick={openFilePicker} disabled={uploading} title="Attach files">
                  {uploading ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <Paperclip size={14} />
                  )}
                </StatusButton>
                <StatusButton
                  onClick={onEnterFocusMode}
                  title="Focus mode"
                  className="hidden sm:flex"
                >
                  <Maximize size={14} />
                </StatusButton>
              </Toolbar.Group>

              <Toolbar.Separator
                orientation="vertical"
                className="mx-1 h-5 w-px shrink-0 bg-border"
              />

              <Toolbar.Group className="flex shrink-0 items-center gap-0.5">
                {showOutline && (
                  <StatusButton onClick={onOpenOutline} active={outlineOpen} title="Outline">
                    <ListTree size={14} />
                  </StatusButton>
                )}
                <StatusButton
                  onClick={onToggleMetaPanel}
                  active={metaPanelOpen}
                  title="Note details"
                >
                  <Info size={14} />
                </StatusButton>
              </Toolbar.Group>
            </Toolbar.Root>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusDivider() {
  return <span className="shrink-0 text-border">·</span>;
}

function StatusMetaSeparator() {
  return <Separator orientation="vertical" className="mx-1 h-4 w-px shrink-0 bg-border" />;
}

function PlainStatusButton({
  children,
  onClick,
  disabled = false,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text-secondary disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function StatusButton({
  children,
  onClick,
  active = false,
  disabled = false,
  title,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  className?: string;
}) {
  return (
    <Toolbar.Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      focusableWhenDisabled={false}
      title={title}
      className={`size-7 shrink-0 items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-35 ${className || "flex"} ${
        active
          ? "bg-surface-active text-accent"
          : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
      }`}
    >
      {children}
    </Toolbar.Button>
  );
}

const modeOptions: { mode: EditorMode; label: string; title: string; icon: ReactNode }[] = [
  { mode: "richtext", label: "RT", title: "Rich Text", icon: <Type size={14} /> },
  { mode: "markdown", label: "MD", title: "Markdown", icon: <Code size={14} /> },
  { mode: "split", label: "SP", title: "Split View", icon: <Columns2 size={14} /> },
];
const mobileModeOptions = modeOptions.filter((option) => option.mode !== "split");

function ModeMenu({
  current,
  onSelect,
}: {
  current: EditorMode;
  onSelect: (mode: EditorMode) => void;
}) {
  const selected = modeOptions.find((option) => option.mode === current) ?? modeOptions[0];

  return (
    <Menu.Root>
      <Menu.Trigger className="flex h-7 shrink-0 items-center gap-1 rounded-md bg-surface-active px-2 font-mono text-[10px] font-semibold tracking-wide text-accent sm:hidden">
        {selected.icon}
        {selected.label}
        <ChevronDown size={12} className="text-text-muted" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="top"
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className="z-50"
        >
          <Menu.Popup className="min-w-32 rounded-xl border border-border bg-surface p-1 text-[13px] text-text shadow-xl outline-none animate-[scale-in_0.1s_ease-out]">
            {mobileModeOptions.map((option) => (
              <Menu.Item
                key={option.mode}
                onClick={() => onSelect(option.mode)}
                className={`flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 outline-none data-[highlighted]:bg-surface-hover ${
                  current === option.mode
                    ? "text-accent"
                    : "text-text-secondary data-[highlighted]:text-text"
                }`}
              >
                <span className="text-text-muted">{option.icon}</span>
                <span>{option.title}</span>
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function ModeButton({
  mode,
  current,
  onClick,
  title,
  icon,
  label,
}: {
  mode: EditorMode;
  current: EditorMode;
  onClick: (mode: EditorMode) => void;
  title: string;
  icon: ReactNode;
  label: string;
}) {
  const active = current === mode;

  return (
    <Toolbar.Button
      type="button"
      onClick={() => onClick(mode)}
      title={title}
      className={`flex h-7 shrink-0 items-center gap-1 rounded-md px-2 font-mono text-[10px] font-semibold tracking-wide ${
        active
          ? "bg-surface-active text-accent motion-pop-in"
          : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
      }`}
    >
      <span className="hidden sm:inline-flex">{icon}</span>
      {label}
    </Toolbar.Button>
  );
}

function DailyDatePicker({ date, onSelect }: { date: Date; onSelect: (date: Date) => void }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(date));
  const today = new Date();
  const canGoNextMonth = dailyTitle(addMonths(month, 1)) <= dailyTitle(startOfMonth(today));
  const days = calendarDays(month);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setMonth(startOfMonth(date));
    setOpen(nextOpen);
  };

  const chooseDate = (nextDate: Date) => {
    if (isAfterDay(nextDate)) return;
    setOpen(false);
    onSelect(nextDate);
  };

  return (
    <BasePopover.Root open={open} onOpenChange={handleOpenChange}>
      <BasePopover.Trigger
        title="Choose daily note date"
        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold text-text hover:bg-surface-hover data-[popup-open]:bg-surface-hover"
      >
        <CalendarDays size={13} className="text-text-muted" />
        {dailyLabel(date)}
      </BasePopover.Trigger>
      <BasePopover.Portal>
        <BasePopover.Positioner
          side="top"
          align="center"
          sideOffset={22}
          collisionPadding={8}
          collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "none" }}
        >
          <BasePopover.Popup className="z-50 w-72 rounded-xl border border-border bg-surface p-2 shadow-xl animate-[fade-in_0.1s_ease-out]">
            <div className="mb-2 flex items-center justify-between px-1">
              <button
                onClick={() => setMonth((current) => addMonths(current, -1))}
                className="flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text-secondary"
                title="Previous month"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="text-sm font-semibold text-text">
                {new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
                  month,
                )}
              </div>
              <button
                onClick={() => setMonth((current) => addMonths(current, 1))}
                disabled={!canGoNextMonth}
                className="flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text-secondary disabled:pointer-events-none disabled:opacity-30"
                title="Next month"
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 px-1 pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              {weekdays.map((day, index) => (
                <div key={`${day}-${index}`}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const selected = dailyTitle(day) === dailyTitle(date);
                const outsideMonth = day.getMonth() !== month.getMonth();
                const disabled = isAfterDay(day);

                return (
                  <button
                    key={dailyTitle(day)}
                    onClick={() => chooseDate(day)}
                    disabled={disabled}
                    className={`flex aspect-square items-center justify-center rounded-md text-sm disabled:pointer-events-none disabled:opacity-25 ${
                      selected
                        ? "bg-accent text-accent-foreground"
                        : outsideMonth
                          ? "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
                          : "text-text-secondary hover:bg-surface-hover hover:text-text"
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => chooseDate(today)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-text"
            >
              <CalendarDays size={14} className="text-text-muted" />
              Today
            </button>
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}

const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function calendarDays(month: Date): Date[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
