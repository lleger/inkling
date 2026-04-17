import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Editor } from "./components/Editor";
import { Sidebar } from "./components/Sidebar";
import { HomePage } from "./components/HomePage";
import { SettingsModal } from "./components/SettingsModal";
import { FocusOverlay } from "./components/FocusOverlay";
import { Toast } from "./components/Toast";
import { TrashView } from "./components/TrashView";
import { CommandPalette, type PaletteAction } from "./components/CommandPalette";
import { PanelLeftOpen, Type, Code, Columns2, Maximize, FilePlus, Copy, PanelLeftClose, Settings, Home, Upload, ListChecks, Trash2, Pin } from "lucide-react";
import { useNotes } from "./hooks/useNotes";
import { useUser } from "./hooks/useUser";
import { useTheme } from "./hooks/useTheme";
import { useSettings } from "./hooks/useSettings";
import { fetchNote, updateNote, restoreNote } from "./lib/api";
import { normalizeMarkdown } from "./lib/normalize-markdown";
import { applyAccent } from "./lib/accent-colors";
import { clearDoneTasks } from "./lib/clear-done-tasks";
import type { Note, SaveStatus, EditorMode } from "./types";


export function App() {
  const { notes, loading, create, remove, refresh, pin } = useNotes();
  const user = useUser();
  const { settings, update: updateSettings } = useSettings();
  const theme = useTheme(settings.theme);

  // Apply accent color to CSS variable
  useEffect(() => {
    applyAccent(settings.accent, theme);
  }, [settings.accent, theme]);

  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; action?: { label: string; onClick: () => void } } | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>(settings.defaultMode);
  const [editorKey, setEditorKey] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [taskStats, setTaskStats] = useState<{ done: number; total: number } | null>(null);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const note of notes) {
      try {
        const parsed = JSON.parse(note.tags) as string[];
        for (const t of parsed) tagSet.add(t);
      } catch {}
    }
    return [...tagSet].sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!selectedTag) return notes;
    return notes.filter((n) => {
      try {
        return (JSON.parse(n.tags) as string[]).includes(selectedTag);
      } catch {
        return false;
      }
    });
  }, [notes, selectedTag]);

  const updateStats = useCallback((content: string) => {
    setWordCount(content.trim().split(/\s+/).filter(Boolean).length);
    const done = (content.match(/- \[x\]/gi) || []).length;
    const undone = (content.match(/- \[ \]/g) || []).length;
    const total = done + undone;
    setTaskStats(total > 0 ? { done, total } : null);
  }, []);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<string | null>(null);
  // Always holds the latest editor content, whether saved or not
  const currentContentRef = useRef<string>("");

  const flushSave = useCallback(async () => {
    if (!activeNote || pendingContentRef.current === null) return;
    const content = pendingContentRef.current;
    pendingContentRef.current = null;
    setSaveStatus("saving");
    try {
      await updateNote(activeNote.id, { content });
      setSaveStatus("saved");
      refresh();
    } catch {
      setSaveStatus("unsaved");
    }
  }, [activeNote, refresh]);

  const handleContentChange = useCallback(
    (content: string) => {
      currentContentRef.current = content;
      pendingContentRef.current = content;
      updateStats(content);
      setSaveStatus("unsaved");

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!activeNote || pendingContentRef.current === null) return;
        const c = pendingContentRef.current;
        pendingContentRef.current = null;
        setSaveStatus("saving");
        try {
          await updateNote(activeNote.id, { content: c });
          setSaveStatus("saved");
          refresh();
        } catch {
          setSaveStatus("unsaved");
        }
      }, 1500);
    },
    [activeNote, refresh],
  );

  const setModeTo = useCallback((next: EditorMode) => {
    setEditorMode((prev) => {
      if (prev === next) return prev;
      currentContentRef.current = normalizeMarkdown(currentContentRef.current);
      setEditorKey((k) => k + 1);
      return next;
    });
  }, []);


  // Load note from URL hash on startup

  useEffect(() => {
    const handler = () => {
      if (document.hidden) flushSave();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [flushSave]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape" && focusMode) {
        e.preventDefault();
        setFocusMode(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [focusMode]);

  const handleSelectNote = useCallback(async (id: string) => {
    try {
      const note = await fetchNote(id);
      setActiveNote(note);
      setShowTrash(false);
      setSaveStatus("saved");
      pendingContentRef.current = null;
      currentContentRef.current = note.content;
      updateStats(note.content);
      window.history.replaceState(null, "", `#${id}`);
    } catch (err) {
      console.error("Failed to load note:", err);
    }
  }, []);

  // Load note from URL hash on startup
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (loading || initialLoadDone.current) return;
    initialLoadDone.current = true;
    const hash = window.location.hash.slice(1);
    if (hash) {
      handleSelectNote(hash);
    }
  }, [loading, handleSelectNote]);

  const handleCreateNote = useCallback(async () => {
    try {
      const note = await create();
      setActiveNote(note);
      setSaveStatus("saved");
      pendingContentRef.current = null;
      currentContentRef.current = note.content;
      updateStats(note.content);
      window.history.replaceState(null, "", `#${note.id}`);
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  }, [create]);

  const handleCreateWithTitle = useCallback(
    async (title: string) => {
      try {
        const note = await create({ title, content: `# ${title}\n\n` });
        setActiveNote(note);
        setSaveStatus("saved");
        pendingContentRef.current = null;
        currentContentRef.current = note.content;
        updateStats(note.content);
        window.history.replaceState(null, "", `#${note.id}`);
      } catch (err) {
        console.error("Failed to create note:", err);
      }
    },
    [create],
  );

  const handleDuplicateNote = useCallback(async () => {
    if (!activeNote) return;
    try {
      const note = await create({ title: `${activeNote.title} (copy)`, content: currentContentRef.current });
      setActiveNote(note);
      setSaveStatus("saved");
      pendingContentRef.current = null;
      currentContentRef.current = note.content;
      updateStats(note.content);
      window.history.replaceState(null, "", `#${note.id}`);
    } catch (err) {
      console.error("Failed to duplicate note:", err);
    }
  }, [create, activeNote]);

  const handleClearDoneTasks = useCallback(() => {
    if (!activeNote || !taskStats || taskStats.done === 0) return;
    const cleaned = clearDoneTasks(currentContentRef.current);
    currentContentRef.current = cleaned;
    handleContentChange(cleaned);
    setEditorKey((k) => k + 1);
  }, [activeNote, taskStats, handleContentChange]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFiles = useCallback(
    async (files: FileList | File[]) => {
      let lastNote: Note | null = null;
      for (const file of Array.from(files)) {
        if (!file.name.endsWith(".md") && !file.name.endsWith(".markdown") && !file.name.endsWith(".txt")) continue;
        const content = await file.text();
        const title = file.name.replace(/\.(md|markdown|txt)$/, "");
        const note = await create({ title, content });
        lastNote = note;
      }
      if (lastNote) {
        setActiveNote(lastNote);
        setSaveStatus("saved");
        pendingContentRef.current = null;
        currentContentRef.current = lastNote.content;
        updateStats(lastNote.content);
        window.history.replaceState(null, "", `#${lastNote.id}`);
      }
    },
    [create],
  );

  const handlePinNote = useCallback(
    async (id: string, pinned: boolean) => {
      await pin(id, pinned);
    },
    [pin],
  );

  const handleDeleteNote = useCallback(
    async (id: string) => {
      const noteTitle = notes.find((n) => n.id === id)?.title || "Note";
      await remove(id);
      if (activeNote?.id === id) {
        setActiveNote(null);
        window.history.replaceState(null, "", window.location.pathname);
      }
      setToast({
        message: `"${noteTitle}" moved to Trash`,
        action: {
          label: "Undo",
          onClick: async () => {
            await restoreNote(id);
            await refresh();
            handleSelectNote(id);
          },
        },
      });
    },
    [remove, activeNote, notes, refresh],
  );

  const isPinned = activeNote ? !!notes.find((n) => n.id === activeNote.id)?.pinned : false;

  const paletteActions: PaletteAction[] = [
      { id: "new-note", label: "New note", icon: <FilePlus size={15} />, category: "action", onSelect: handleCreateNote },
      { id: "duplicate-note", label: "Duplicate note", icon: <Copy size={15} />, category: "action", onSelect: handleDuplicateNote },
      ...(activeNote ? [
        { id: "toggle-pin", label: isPinned ? "Unpin note" : "Pin note", icon: <Pin size={15} />, category: "action" as const, onSelect: () => handlePinNote(activeNote.id, !isPinned) },
        { id: "delete-note", label: "Delete note", icon: <Trash2 size={15} />, category: "action" as const, onSelect: () => handleDeleteNote(activeNote.id) },
      ] : []),
      { id: "import-md", label: "Import markdown", icon: <Upload size={15} />, category: "action", onSelect: () => fileInputRef.current?.click() },
      { id: "go-home", label: "Go home", icon: <Home size={15} />, category: "action", onSelect: () => { setActiveNote(null); window.history.replaceState(null, "", window.location.pathname); } },
      { id: "mode-richtext", label: "Rich text mode", icon: <Type size={15} />, category: "action", onSelect: () => setModeTo("richtext") },
      { id: "mode-markdown", label: "Markdown mode", icon: <Code size={15} />, category: "action", onSelect: () => setModeTo("markdown") },
      { id: "mode-split", label: "Split view", icon: <Columns2 size={15} />, category: "action", onSelect: () => setModeTo("split") },
      { id: "focus-mode", label: "Focus mode", icon: <Maximize size={15} />, category: "action", onSelect: () => setFocusMode(true) },
      { id: "toggle-sidebar", label: "Toggle sidebar", icon: <PanelLeftClose size={15} />, category: "action", onSelect: () => setSidebarOpen((o) => !o) },
      { id: "trash", label: "Trash", icon: <Trash2 size={15} />, category: "action", onSelect: () => { setActiveNote(null); setShowTrash(true); window.history.replaceState(null, "", window.location.pathname); } },
      { id: "settings", label: "Settings", icon: <Settings size={15} />, category: "action", onSelect: () => setSettingsOpen(true) },
      ...(taskStats && taskStats.done > 0
        ? [{ id: "clear-done", label: `Clear ${taskStats.done} done tasks`, icon: <ListChecks size={15} />, category: "action" as const, onSelect: handleClearDoneTasks }]
        : []),
  ];

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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className={`flex h-full transition-opacity duration-200 ${focusMode ? "opacity-0 pointer-events-none w-0 overflow-hidden" : "opacity-100"}`}>
        <Sidebar
          notes={filteredNotes}
          activeNoteId={activeNote?.id ?? null}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
          onCollapse={() => setSidebarOpen(false)}
          onHome={() => { setActiveNote(null); setSelectedTag(null); setShowTrash(false); window.history.replaceState(null, "", window.location.pathname); }}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenTrash={() => { setActiveNote(null); setShowTrash(true); window.history.replaceState(null, "", window.location.pathname); }}
          onTogglePin={(id) => {
            const note = notes.find((n) => n.id === id);
            if (note) handlePinNote(id, !note.pinned);
          }}
          userEmail={user?.email ?? null}
          open={sidebarOpen && !focusMode}
          saveStatus={saveStatus}
          allTags={allTags}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
        />
      </div>

      <main className="relative flex flex-1 justify-center overflow-y-auto bg-surface">
        <div className={`transition-opacity duration-200 ${focusMode ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          {/* Sidebar expand — far left */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              title="Open sidebar"
              className="fixed top-3 left-3 z-10 flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}

          {/* Stats — bottom right */}
          {activeNote && (
            <div className="fixed bottom-4 right-4 z-10 flex items-center gap-2 rounded-lg bg-surface-secondary/80 backdrop-blur-sm border border-border px-3 py-1.5 text-[11px] text-text-muted select-none">
              {taskStats && (
                <>
                  {taskStats.done > 0 ? (
                    <button
                      onClick={handleClearDoneTasks}
                      title="Clear done tasks"
                      className="transition-colors hover:text-text-secondary"
                    >
                      {taskStats.done}/{taskStats.total} tasks
                    </button>
                  ) : (
                    <span>{taskStats.done}/{taskStats.total} tasks</span>
                  )}
                  <span className="text-border">·</span>
                </>
              )}
              <span className={wordCount > 10000 ? "text-accent" : ""}>{wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}{wordCount > 10000 ? " — large note" : ""}</span>
            </div>
          )}

          {/* Mode switcher — far right, grouped */}
          {activeNote && (
            <div className="fixed top-3 right-3 z-10 flex flex-col items-center rounded-lg bg-surface-secondary border border-border p-0.5">
              <div className="flex flex-col gap-0.5">
                {modeBtn("richtext", <Type size={15} />, "Rich Text")}
                {modeBtn("markdown", <Code size={15} />, "Markdown")}
                {modeBtn("split", <Columns2 size={15} />, "Split View")}
              </div>
              <div className="w-5 h-px bg-border my-1.5" />
              <button
                onClick={() => setFocusMode(true)}
                title="Focus mode"
                className="flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
              >
                <Maximize size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Focus mode exit hint */}
        {focusMode && <FocusOverlay onExit={() => setFocusMode(false)} />}

        {activeNote ? (
          <Editor
            key={`${activeNote.id}-${editorKey}`}
            content={currentContentRef.current}
            onChange={handleContentChange}
            mode={editorMode}
            smartTypography={settings.smartTypography}
          />
        ) : showTrash ? (
          <TrashView onNoteRestored={refresh} />
        ) : (
          <HomePage
            notes={notes}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
            onImportFiles={handleImportFiles}
            allTags={allTags}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
          />
        )}
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        notes={notes}
        actions={paletteActions}
        onSelectNote={handleSelectNote}
        onCreateWithTitle={handleCreateWithTitle}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        userEmail={user?.email ?? null}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleImportFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {toast && <Toast message={toast.message} action={toast.action} onDismiss={() => setToast(null)} />}
    </div>
  );
}
