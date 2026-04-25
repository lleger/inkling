import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Type, Code, Columns2, Maximize } from "lucide-react";
import { Editor } from "../components/Editor";
import { useUI } from "../context/UIContext";
import { useSettings } from "../hooks/useSettings";
import { noteQuery, queryKeys } from "../lib/queries";
import { updateNote } from "../lib/api";
import { normalizeMarkdown } from "../lib/normalize-markdown";
import { clearDoneTasks } from "../lib/clear-done-tasks";
import type { EditorMode, SaveStatus } from "../types";

export const Route = createFileRoute("/_app/notes/$id")({
  loader: ({ context: { queryClient }, params: { id } }) =>
    queryClient.ensureQueryData(noteQuery(id)),
  component: NoteRoute,
});

function NoteRoute() {
  const { id } = Route.useParams();
  const ui = useUI();
  const { settings } = useSettings();
  const qc = useQueryClient();
  const { data: note } = useQuery(noteQuery(id));

  const [editorMode, setEditorMode] = useState<EditorMode>(settings.defaultMode);
  const [editorKey, setEditorKey] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [wordCount, setWordCount] = useState(0);
  const [taskStats, setTaskStats] = useState<{ done: number; total: number } | null>(null);

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
    updateStats(note.content);
    setEditorKey((k) => k + 1);
  }, [note, updateStats]);

  const saveMutation = useMutation({
    mutationFn: (content: string) => updateNote(id, { content }),
    onSuccess: (_, content) => {
      setSaveStatus("saved");
      lastSavedContentRef.current = content;
      retryCountRef.current = 0;
      qc.invalidateQueries({ queryKey: queryKeys.notes });
      qc.invalidateQueries({ queryKey: queryKeys.note(id) });
    },
  });

  const saveContent = useCallback(async (content: string) => {
    setSaveStatus("saving");
    try {
      await saveMutation.mutateAsync(content);
    } catch {
      retryCountRef.current++;
      if (retryCountRef.current < 3) {
        const delay = 2000 * Math.pow(2, retryCountRef.current - 1);
        setSaveStatus("unsaved");
        setTimeout(() => {
          if (pendingContentRef.current !== null) return;
          saveContent(content);
        }, delay);
      } else {
        setSaveStatus("unsaved");
        retryCountRef.current = 0;
        ui.setToast({ message: "Failed to save. Check your connection." });
      }
    }
  }, [saveMutation, ui]);

  const handleContentChange = useCallback((content: string) => {
    currentContentRef.current = content;
    updateStats(content);
    if (content === lastSavedContentRef.current) return;
    pendingContentRef.current = content;
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (pendingContentRef.current === null) return;
      const c = pendingContentRef.current;
      pendingContentRef.current = null;
      await saveContent(c);
    }, 1500);
  }, [updateStats, saveContent]);

  const flushSave = useCallback(() => {
    if (pendingContentRef.current === null) return;
    const c = pendingContentRef.current;
    pendingContentRef.current = null;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveContent(c);
  }, [saveContent]);

  // Flush on tab switch
  useEffect(() => {
    const handler = () => { if (document.hidden) flushSave(); };
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
        editorMode === mode ? "text-accent" : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
      }`}
    >
      {icon}
    </button>
  );

  if (!note) return null;

  return (
    <>
      {/* Mode switcher */}
      <div className={`fixed top-3 right-3 z-10 flex flex-col items-center rounded-lg bg-surface-secondary border border-border p-0.5 transition-opacity duration-200 ${ui.focusMode ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <div className="flex flex-col gap-0.5">
          {modeBtn("richtext", <Type size={15} />, "Rich Text")}
          {modeBtn("markdown", <Code size={15} />, "Markdown")}
          {modeBtn("split", <Columns2 size={15} />, "Split View")}
        </div>
        <div className="w-5 h-px bg-border my-1.5" />
        <button
          onClick={() => ui.setFocusMode(true)}
          title="Focus mode"
          className="flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
        >
          <Maximize size={15} />
        </button>
      </div>

      {/* Stats — bottom right */}
      <div className={`fixed bottom-4 right-4 z-10 flex items-center gap-2 rounded-lg bg-surface-secondary/80 backdrop-blur-sm border border-border px-3 py-1.5 text-[11px] text-text-muted select-none transition-opacity duration-200 ${ui.focusMode ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        {taskStats && (
          <>
            {taskStats.done > 0 ? (
              <button onClick={handleClearDoneTasks} className="transition-colors hover:text-text-secondary">
                {taskStats.done}/{taskStats.total} tasks
              </button>
            ) : (
              <span>{taskStats.done}/{taskStats.total} tasks</span>
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
        smartTypography={settings.smartTypography}
      />
    </>
  );
}
