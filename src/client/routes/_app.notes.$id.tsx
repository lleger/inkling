import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import { Editor } from "../components/Editor";
import { EditorStatusLine } from "../components/EditorStatusLine";
import { MetaPanel } from "../components/MetaPanel";
import { TableOfContentsDrawer } from "../components/TableOfContents";
import { useUI } from "../context/UIContext";
import { useSettings } from "../hooks/useSettings";
import { useDailyNote } from "../hooks/useDailyNote";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { noteQuery } from "../lib/queries";
import { updateNote } from "../lib/api";
import { invalidateBacklinks, invalidateNotes, writeCachedNote } from "../lib/note-cache";
import { normalizeMarkdown } from "../lib/normalize-markdown";
import { clearDoneTasks } from "../lib/clear-done-tasks";
import { addDays, dailyFolder, isAfterDay, parseDailyTitle } from "../lib/daily-notes";
import { saveStatusMeta } from "../lib/save-status";
import { PageLoading, RouteError } from "../components/LoadStates";
import {
  normalizeHeadingText,
  parseMarkdownHeadingLine,
  parseTableOfContents,
  type TocHeading,
} from "../lib/table-of-contents";
import type { EditorMode, SaveStatus } from "../types";

export const Route = createFileRoute("/_app/notes/$id")({
  loader: ({ context: { queryClient }, params: { id } }) =>
    queryClient.ensureQueryData(noteQuery(id)),
  component: NoteRoute,
  errorComponent: RouteError,
  pendingComponent: () => <PageLoading label="Loading note..." />,
  pendingMs: 0,
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
  const [tocHeadings, setTocHeadings] = useState<TocHeading[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedPulseKey, setSavedPulseKey] = useState(0);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<string | null>(null);
  const currentContentRef = useRef<string>("");
  const lastSavedContentRef = useRef<string>("");
  const previousSaveStatusRef = useRef<SaveStatus>("saved");
  const retryCountRef = useRef(0);
  const loadedNoteIdRef = useRef<string>("");

  const updateStats = useCallback((content: string) => {
    setWordCount(content.trim().split(/\s+/).filter(Boolean).length);
    const done = (content.match(/- \[x\]/gi) || []).length;
    const undone = (content.match(/- \[ \]/g) || []).length;
    const total = done + undone;
    setTaskStats(total > 0 ? { done, total } : null);
    setTocHeadings(parseTableOfContents(content));
  }, []);

  const scrollToHeading = useCallback(
    (heading: TocHeading) => {
      const target = getHeadingTargets(tocHeadings, editorMode).get(heading.id);
      if (!target) return;

      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveHeadingId(heading.id);
    },
    [editorMode, tocHeadings],
  );

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

  useEffect(() => {
    const previous = previousSaveStatusRef.current;
    if (saveStatus === "saved" && (previous === "saving" || previous === "unsaved")) {
      setSavedPulseKey((key) => key + 1);
    }
    previousSaveStatusRef.current = saveStatus;
  }, [saveStatus]);

  useEffect(() => {
    if (editorMode === "split" || ui.focusMode || tocHeadings.length === 0) {
      setOutlineOpen(false);
    }
  }, [editorMode, tocHeadings.length, ui.focusMode]);

  useEffect(() => {
    if (editorMode === "split" || ui.focusMode || tocHeadings.length === 0) {
      setActiveHeadingId(null);
      return;
    }

    const scrollParent = document.querySelector("main.overflow-y-auto") as HTMLElement | null;
    if (!scrollParent) return;

    let frame = 0;
    const updateActiveHeading = () => {
      frame = 0;
      const targets = getHeadingTargets(tocHeadings, editorMode);
      const parentTop = scrollParent.getBoundingClientRect().top;
      let active = tocHeadings[0]?.id ?? null;

      for (const heading of tocHeadings) {
        const target = targets.get(heading.id);
        if (!target) continue;
        if (target.getBoundingClientRect().top - parentTop <= 96) {
          active = heading.id;
        } else {
          break;
        }
      }

      setActiveHeadingId(active);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveHeading);
    };

    updateActiveHeading();
    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scrollParent.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [editorMode, tocHeadings, ui.focusMode]);

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
    const onAttachmentDeleted = (e: Event) => {
      const attachmentId = (e as CustomEvent<string>).detail;
      if (!attachmentId) return;
      const cleaned = removeAttachmentMarkdown(currentContentRef.current, attachmentId);
      if (cleaned === currentContentRef.current) return;
      currentContentRef.current = cleaned;
      handleContentChange(cleaned);
      setEditorKey((k) => k + 1);
    };
    document.addEventListener("editor-mode", onMode);
    document.addEventListener("clear-done-tasks", onClear);
    document.addEventListener("attachment-deleted", onAttachmentDeleted);
    return () => {
      document.removeEventListener("editor-mode", onMode);
      document.removeEventListener("clear-done-tasks", onClear);
      document.removeEventListener("attachment-deleted", onAttachmentDeleted);
    };
  }, [setModeTo, handleClearDoneTasks, handleContentChange]);

  if (!note) return null;

  const dailyDate = note.folder === dailyFolder(settings) ? parseDailyTitle(note.title) : null;
  const nextDailyDate = dailyDate ? addDays(dailyDate, 1) : null;
  const canOpenNextDailyDate = nextDailyDate !== null && !isAfterDay(nextDailyDate);
  const saveMeta = saveStatusMeta(saveStatus);

  return (
    <>
      <MetaPanel note={note} wordCount={wordCount} taskStats={taskStats} />

      <TableOfContentsDrawer
        headings={tocHeadings}
        activeHeadingId={activeHeadingId}
        onSelect={scrollToHeading}
        open={outlineOpen}
        onOpenChange={setOutlineOpen}
      />

      {/* Editor */}
      <Editor
        key={`${note.id}-${editorKey}`}
        content={currentContentRef.current}
        onChange={handleContentChange}
        mode={editorMode}
        noteId={note.id}
        copyMarkdownByDefault={settings.copyMarkdownByDefault}
        smartTypography={settings.smartTypography}
        attachmentControl={({ openFilePicker, uploading }) => (
          <EditorStatusLine
            focusMode={ui.focusMode}
            editorMode={editorMode}
            setModeTo={setModeTo}
            saveStatus={saveStatus}
            saveMeta={saveMeta}
            savedPulseKey={savedPulseKey}
            wordCount={wordCount}
            taskStats={taskStats}
            onClearDoneTasks={handleClearDoneTasks}
            metaPanelOpen={ui.metaPanelOpen}
            onToggleMetaPanel={() => ui.setMetaPanelOpen((o) => !o)}
            showOutline={editorMode !== "split" && tocHeadings.length > 0}
            outlineOpen={outlineOpen}
            onOpenOutline={() => setOutlineOpen(true)}
            onEnterFocusMode={() => ui.setFocusMode(true)}
            dailyDate={dailyDate}
            canOpenNextDailyDate={canOpenNextDailyDate}
            onOpenDailyNote={openDailyNote}
            openFilePicker={openFilePicker}
            uploading={uploading}
            mainInsetLeft={ui.sidebarOpen && !ui.focusMode ? ui.sidebarWidth : 0}
          />
        )}
      />
    </>
  );
}

function getHeadingTargets(headings: TocHeading[], mode: EditorMode): Map<string, HTMLElement> {
  const targets = new Map<string, HTMLElement>();
  const occurrences = new Map<string, number>();
  const elements = getHeadingElements(mode);

  for (const element of elements) {
    const parsed = getElementHeading(element, mode);
    if (!parsed) continue;

    const textKey = normalizeHeadingText(parsed.text);
    const occurrence = (occurrences.get(textKey) ?? 0) + 1;
    occurrences.set(textKey, occurrence);

    const heading = headings.find(
      (h) =>
        h.level === parsed.level &&
        normalizeHeadingText(h.text) === textKey &&
        h.occurrence === occurrence,
    );
    if (heading) targets.set(heading.id, element);
  }

  return targets;
}

function removeAttachmentMarkdown(content: string, id: string): string {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content
    .replace(
      new RegExp(`!?\\[[^\\]\\n]*\\]\\(\\/api\\/attachments\\/${escaped}\\/content\\)`, "g"),
      "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

function getHeadingElements(mode: EditorMode): HTMLElement[] {
  if (mode === "markdown") {
    return Array.from(
      document.querySelectorAll<HTMLElement>(".editor-mono .editor-paragraph-mono"),
    );
  }

  return Array.from(
    document.querySelectorAll<HTMLElement>(
      ".editor-rich .editor-heading-h1, .editor-rich .editor-heading-h2, .editor-rich .editor-heading-h3, .editor-rich .editor-heading-h4, .editor-rich .editor-heading-h5, .editor-rich .editor-heading-h6",
    ),
  );
}

function getElementHeading(
  element: HTMLElement,
  mode: EditorMode,
): { level: TocHeading["level"]; text: string } | null {
  if (mode === "markdown") return parseMarkdownHeadingLine(element.textContent ?? "");

  const match = element.className.match(/editor-heading-h([1-6])/);
  if (!match) return null;

  const text = (element.textContent ?? "").trim();
  if (!text) return null;

  return { level: Number(match[1]) as TocHeading["level"], text };
}
