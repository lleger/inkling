import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Type,
  Code,
  Columns2,
  Maximize,
  Info,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { Editor } from "../components/Editor";
import { MetaPanel } from "../components/MetaPanel";
import { useUI } from "../context/UIContext";
import { useSettings } from "../hooks/useSettings";
import { useDailyNote } from "../hooks/useDailyNote";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { noteQuery } from "../lib/queries";
import { updateNote } from "../lib/api";
import { invalidateBacklinks, invalidateNotes, writeCachedNote } from "../lib/note-cache";
import { normalizeMarkdown } from "../lib/normalize-markdown";
import { clearDoneTasks } from "../lib/clear-done-tasks";
import {
  addDays,
  dailyFolder,
  dailyLabel,
  dailyTitle,
  isAfterDay,
  parseDailyTitle,
} from "../lib/daily-notes";
import { saveStatusMeta } from "../lib/save-status";
import type { EditorMode, SaveStatus } from "../types";

export const Route = createFileRoute("/_app/notes/$id")({
  loader: ({ context: { queryClient }, params: { id } }) =>
    queryClient.ensureQueryData(noteQuery(id)),
  component: NoteRoute,
});

function NoteRoute() {
  const { id } = Route.useParams();
  const ui = useUI();
  const { setSaveStatus: setGlobalSaveStatus, showToast } = ui;
  const { settings } = useSettings();
  const { openDailyNote } = useDailyNote();
  const qc = useQueryClient();
  const { data: note } = useQuery(noteQuery(id));
  useDocumentTitle(note?.title);

  const [editorMode, setEditorMode] = useState<EditorMode>(settings.defaultMode);
  const [editorKey, setEditorKey] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [taskStats, setTaskStats] = useState<{ done: number; total: number } | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<string | null>(null);
  const currentContentRef = useRef<string>("");
  const lastSavedContentRef = useRef<string>("");
  const retryCountRef = useRef(0);
  const loadedNoteIdRef = useRef<string>("");

  const updateStats = useCallback((content: string) => {
    setWordCount(content.trim().split(/\s+/).filter(Boolean).length);
    const done = (content.match(/- \[x\]/gi) || []).length;
    const undone = (content.match(/- \[ \]/g) || []).length;
    const total = done + undone;
    setTaskStats(total > 0 ? { done, total } : null);
  }, []);

  // When note changes (route param or first load), reset editor state
  useEffect(() => {
    if (!note || note.id === loadedNoteIdRef.current) return;
    loadedNoteIdRef.current = note.id;
    currentContentRef.current = note.content;
    lastSavedContentRef.current = note.content;
    pendingContentRef.current = null;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    retryCountRef.current = 0;
    setSaveStatus("saved");
    setGlobalSaveStatus("saved");
    updateStats(note.content);
    setEditorKey((k) => k + 1);
  }, [note, updateStats, setGlobalSaveStatus]);

  useEffect(() => {
    setGlobalSaveStatus(saveStatus);
  }, [saveStatus, setGlobalSaveStatus]);

  useEffect(() => () => setGlobalSaveStatus("saved"), [setGlobalSaveStatus]);

  const saveMutation = useMutation({
    mutationFn: (content: string) => updateNote(id, { content }),
    onSuccess: (savedNote, content) => {
      lastSavedContentRef.current = content;
      retryCountRef.current = 0;
      setSaveStatus(
        content === currentContentRef.current && pendingContentRef.current === null
          ? "saved"
          : "unsaved",
      );
      writeCachedNote(qc, savedNote);
      invalidateNotes(qc);
      // Saving may add/remove wiki-links → backlinks for the targets
      // change. Invalidate broadly; cheap, only refetches when panels
      // are mounted.
      invalidateBacklinks(qc);
    },
  });

  const saveContent = useCallback(
    async (content: string) => {
      setSaveStatus("saving");
      try {
        await saveMutation.mutateAsync(content);
      } catch {
        retryCountRef.current++;
        if (retryCountRef.current < 3) {
          const delay = 2000 * Math.pow(2, retryCountRef.current - 1);
          setTimeout(() => {
            if (pendingContentRef.current !== null) return;
            saveContent(content);
          }, delay);
        } else {
          retryCountRef.current = 0;
          setSaveStatus("failed");
          showToast({ message: "Failed to save. Check your connection." });
        }
      }
    },
    [saveMutation, showToast],
  );

  const handleContentChange = useCallback(
    (content: string) => {
      currentContentRef.current = content;
      updateStats(content);
      if (content === lastSavedContentRef.current) {
        pendingContentRef.current = null;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        setSaveStatus("saved");
        return;
      }
      setSaveStatus("unsaved");
      pendingContentRef.current = content;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (pendingContentRef.current === null) return;
        const c = pendingContentRef.current;
        pendingContentRef.current = null;
        await saveContent(c);
      }, 1500);
    },
    [updateStats, saveContent],
  );

  const flushSave = useCallback(() => {
    if (pendingContentRef.current === null) return;
    const c = pendingContentRef.current;
    pendingContentRef.current = null;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveContent(c);
  }, [saveContent]);

  // Flush on tab switch
  useEffect(() => {
    const handler = () => {
      if (document.hidden) flushSave();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [flushSave]);

  const setModeTo = useCallback((next: EditorMode) => {
    setEditorMode((prev) => {
      if (prev === next) return prev;
      currentContentRef.current = normalizeMarkdown(currentContentRef.current);
      setEditorKey((k) => k + 1);
      return next;
    });
  }, []);

  const handleClearDoneTasks = useCallback(() => {
    if (!taskStats || taskStats.done === 0) return;
    const cleaned = clearDoneTasks(currentContentRef.current);
    currentContentRef.current = cleaned;
    handleContentChange(cleaned);
    setEditorKey((k) => k + 1);
  }, [taskStats, handleContentChange]);

  // Listen for events from the command palette (in _app layout)
  useEffect(() => {
    const onMode = (e: Event) => setModeTo((e as CustomEvent).detail);
    const onClear = () => handleClearDoneTasks();
    document.addEventListener("editor-mode", onMode);
    document.addEventListener("clear-done-tasks", onClear);
    return () => {
      document.removeEventListener("editor-mode", onMode);
      document.removeEventListener("clear-done-tasks", onClear);
    };
  }, [setModeTo, handleClearDoneTasks]);

  const modeBtn = (mode: EditorMode, icon: React.ReactNode, title: string) => (
    <button
      onClick={() => setModeTo(mode)}
      title={title}
      className={`flex size-8 items-center justify-center rounded-md transition-all ${
        editorMode === mode
          ? "text-accent"
          : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
      }`}
    >
      {icon}
    </button>
  );

  if (!note) return null;

  const dailyDate = note.folder === dailyFolder(settings) ? parseDailyTitle(note.title) : null;
  const nextDailyDate = dailyDate ? addDays(dailyDate, 1) : null;
  const canOpenNextDailyDate = nextDailyDate !== null && !isAfterDay(nextDailyDate);
  const saveMeta = saveStatusMeta(saveStatus);

  return (
    <>
      {dailyDate && !ui.focusMode && (
        <div className="fixed top-14 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border bg-surface-secondary/90 p-0.5 shadow-sm backdrop-blur-sm sm:top-3">
          <button
            onClick={() => openDailyNote(addDays(dailyDate, -1))}
            title="Open previous day"
            className="flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
          >
            <ChevronLeft size={14} />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <DailyDatePicker date={dailyDate} onSelect={openDailyNote} />
          <button
            onClick={() => nextDailyDate && openDailyNote(nextDailyDate)}
            disabled={!canOpenNextDailyDate}
            title="Open next day"
            className="flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:pointer-events-none disabled:opacity-30"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Mode switcher */}
      <div
        className={`fixed top-3 right-3 z-10 flex items-center rounded-lg border border-border bg-surface-secondary/90 p-0.5 shadow-sm backdrop-blur-sm transition-opacity duration-200 md:flex-col md:bg-surface-secondary md:shadow-none md:backdrop-blur-none ${ui.focusMode ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <div className="flex gap-0.5 md:flex-col">
          {modeBtn("richtext", <Type size={15} />, "Rich Text")}
          {modeBtn("markdown", <Code size={15} />, "Markdown")}
          {modeBtn("split", <Columns2 size={15} />, "Split View")}
        </div>
        <div className="mx-1.5 h-5 w-px bg-border md:mx-0 md:my-1.5 md:h-px md:w-5" />
        <button
          onClick={() => ui.setMetaPanelOpen((o) => !o)}
          title="Note details"
          className={`flex size-8 items-center justify-center rounded-md transition-colors ${
            ui.metaPanelOpen
              ? "text-accent"
              : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
          }`}
        >
          <Info size={15} />
        </button>
        <button
          onClick={() => ui.setFocusMode(true)}
          title="Focus mode"
          className="flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
        >
          <Maximize size={15} />
        </button>
      </div>

      <MetaPanel note={note} wordCount={wordCount} taskStats={taskStats} />

      {/* Stats — bottom right */}
      <div
        className={`fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-lg border border-border bg-surface-secondary/80 px-3 py-1.5 text-[11px] text-text-muted shadow-sm backdrop-blur-sm select-none transition-opacity duration-200 sm:right-4 sm:bottom-4 ${ui.focusMode ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <span
          className={`inline-flex items-center gap-1.5 ${saveMeta.textClassName}`}
          title={saveMeta.label}
        >
          <span className={`size-1.5 rounded-full ${saveMeta.dotClassName}`} />
          {saveMeta.shortLabel}
        </span>
        <span className="text-border">·</span>
        {taskStats && (
          <>
            {taskStats.done > 0 ? (
              <button
                onClick={handleClearDoneTasks}
                className="transition-colors hover:text-text-secondary"
              >
                {taskStats.done}/{taskStats.total} tasks
              </button>
            ) : (
              <span>
                {taskStats.done}/{taskStats.total} tasks
              </span>
            )}
            <span className="text-border">·</span>
          </>
        )}
        <span className={wordCount > 10000 ? "text-accent" : ""}>
          {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
          {wordCount > 10000 ? " — large note" : ""}
        </span>
      </div>

      {/* Editor */}
      <Editor
        key={`${note.id}-${editorKey}`}
        content={currentContentRef.current}
        onChange={handleContentChange}
        mode={editorMode}
        copyMarkdownByDefault={settings.copyMarkdownByDefault}
        smartTypography={settings.smartTypography}
      />
    </>
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
        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold text-text transition-colors hover:bg-surface-hover data-[popup-open]:bg-surface-hover"
      >
        <CalendarDays size={13} className="text-text-muted" />
        {dailyLabel(date)}
      </BasePopover.Trigger>
      <BasePopover.Portal>
        <BasePopover.Positioner
          side="bottom"
          align="center"
          sideOffset={8}
          collisionPadding={8}
          collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "none" }}
        >
          <BasePopover.Popup className="z-50 w-72 rounded-xl border border-border bg-surface p-2 shadow-lg animate-[fade-in_0.1s_ease-out]">
            <div className="mb-2 flex items-center justify-between px-1">
              <button
                onClick={() => setMonth((current) => addMonths(current, -1))}
                className="flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
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
                className="flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:pointer-events-none disabled:opacity-30"
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
                    className={`flex aspect-square items-center justify-center rounded-md text-sm transition-colors disabled:pointer-events-none disabled:opacity-25 ${
                      selected
                        ? "bg-accent text-white"
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
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
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
