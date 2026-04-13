import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Editor } from "./components/Editor";
import { Sidebar } from "./components/Sidebar";
import { HomePage } from "./components/HomePage";
import { ShortcutsHud } from "./components/ShortcutsHud";
import { SettingsModal } from "./components/SettingsModal";
import { FocusOverlay } from "./components/FocusOverlay";
import { CommandPalette, type PaletteAction } from "./components/CommandPalette";
import { PanelLeftOpen, Type, Code, Columns2, Maximize, FilePlus, Copy, PanelLeftClose, Settings, Keyboard, Home } from "lucide-react";
import { useNotes } from "./hooks/useNotes";
import { useUser } from "./hooks/useUser";
import { useTheme } from "./hooks/useTheme";
import { useSettings } from "./hooks/useSettings";
import { fetchNote, updateNote } from "./lib/api";
import { normalizeMarkdown } from "./lib/normalize-markdown";
import { applyAccent } from "./lib/accent-colors";
import type { Note, SaveStatus, EditorMode } from "./types";

const MODE_CYCLE: EditorMode[] = ["richtext", "markdown", "split"];

export function App() {
  const { notes, loading, create, remove, refresh } = useNotes();
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
  const [hudOpen, setHudOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
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

  const cycleMode = useCallback(() => {
    setEditorMode((prev) => {
      currentContentRef.current = normalizeMarkdown(currentContentRef.current);
      const idx = MODE_CYCLE.indexOf(prev);
      setEditorKey((k) => k + 1);
      return MODE_CYCLE[(idx + 1) % MODE_CYCLE.length];
    });
  }, []);

  // Load note from URL hash on startup
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.slice(1);
    if (hash && !activeNote) {
      handleSelectNote(hash);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = () => {
      if (document.hidden) flushSave();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [flushSave]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key === "S") {
        e.preventDefault();
        setSidebarOpen((o) => !o);
      }
      if (mod && e.shiftKey && e.key === "N") {
        e.preventDefault();
        handleCreateNote();
      }
      if (mod && e.shiftKey && e.key === "M") {
        e.preventDefault();
        cycleMode();
      }
      if (mod && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setFocusMode((f) => !f);
      }
      if (e.key === "Escape" && focusMode) {
        e.preventDefault();
        setFocusMode(false);
      }
      if (mod && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (mod && e.key === "/") {
        e.preventDefault();
        setHudOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [flushSave, cycleMode, focusMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectNote = useCallback(async (id: string) => {
    try {
      const note = await fetchNote(id);
      setActiveNote(note);
      setSaveStatus("saved");
      pendingContentRef.current = null;
      currentContentRef.current = note.content;
      updateStats(note.content);
      window.history.replaceState(null, "", `#${id}`);
    } catch (err) {
      console.error("Failed to load note:", err);
    }
  }, []);

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

  const handleDeleteNote = useCallback(
    async (id: string) => {
      await remove(id);
      if (activeNote?.id === id) {
        setActiveNote(null);
        window.history.replaceState(null, "", window.location.pathname);
      }
    },
    [remove, activeNote],
  );

  const paletteActions: PaletteAction[] = useMemo(
    () => [
      { id: "new-note", label: "New note", icon: <FilePlus size={15} />, category: "action", onSelect: handleCreateNote },
      { id: "duplicate-note", label: "Duplicate note", icon: <Copy size={15} />, category: "action", onSelect: handleDuplicateNote },
      { id: "go-home", label: "Go home", icon: <Home size={15} />, category: "action", onSelect: () => { setActiveNote(null); window.history.replaceState(null, "", window.location.pathname); } },
      { id: "mode-richtext", label: "Rich text mode", icon: <Type size={15} />, category: "action", onSelect: () => setModeTo("richtext") },
      { id: "mode-markdown", label: "Markdown mode", icon: <Code size={15} />, category: "action", onSelect: () => setModeTo("markdown") },
      { id: "mode-split", label: "Split view", icon: <Columns2 size={15} />, category: "action", onSelect: () => setModeTo("split") },
      { id: "focus-mode", label: "Focus mode", icon: <Maximize size={15} />, category: "action", onSelect: () => setFocusMode(true) },
      { id: "toggle-sidebar", label: "Toggle sidebar", icon: <PanelLeftClose size={15} />, category: "action", onSelect: () => setSidebarOpen((o) => !o) },
      { id: "settings", label: "Settings", icon: <Settings size={15} />, category: "action", onSelect: () => setSettingsOpen(true) },
      { id: "shortcuts", label: "Keyboard shortcuts", icon: <Keyboard size={15} />, category: "action", onSelect: () => setHudOpen(true) },
    ],
    [handleCreateNote, handleDuplicateNote, setModeTo],
  );

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
          onHome={() => { setActiveNote(null); setSelectedTag(null); window.history.replaceState(null, "", window.location.pathname); }}
          onOpenSettings={() => setSettingsOpen(true)}
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
                  <span>{taskStats.done}/{taskStats.total} tasks</span>
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
        ) : (
          <HomePage
            notes={notes}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
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
      <ShortcutsHud open={hudOpen} onClose={() => setHudOpen(false)} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        userEmail={user?.email ?? null}
      />
    </div>
  );
}
