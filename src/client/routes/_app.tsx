import { createFileRoute, Outlet, redirect, useNavigate, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { Sidebar } from "../components/Sidebar";
import { SettingsModal } from "../components/SettingsModal";
import { FocusOverlay } from "../components/FocusOverlay";
import { Toast } from "../components/Toast";
import { MoveToFolderModal } from "../components/MoveToFolderModal";
import { CommandPalette, type PaletteAction } from "../components/CommandPalette";
import {
  PanelLeftOpen, FilePlus, Copy, Settings, Home, Upload, Trash2, Pin,
  History, FolderInput, Type, Code, Columns2, Maximize, PanelLeftClose,
  CalendarDays,
} from "lucide-react";
import { useNotes } from "../hooks/useNotes";
import { useUser } from "../hooks/useUser";
import { useTheme } from "../hooks/useTheme";
import { useSettings } from "../hooks/useSettings";
import { useDailyNote } from "../hooks/useDailyNote";
import { applyAccent } from "../lib/accent-colors";
import { useUI } from "../context/UIContext";
import { authClient } from "../lib/auth-client";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const session = await authClient.getSession();
    if (!session.data?.user) {
      throw redirect({
        to: "/login",
        search: { mode: "signin" as const, redirect: location.pathname },
      });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const ui = useUI();
  const { notes, create, remove, restore, pin, move } = useNotes();
  const user = useUser();
  const { settings, update: updateSettings } = useSettings();
  const theme = useTheme(settings.theme);
  const { openDailyNote } = useDailyNote();

  // Apply accent
  useEffect(() => { applyAccent(settings.accent, theme); }, [settings.accent, theme]);

  // Cmd+Shift+D — open today's daily note
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        openDailyNote();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openDailyNote]);

  // Derive active note from URL
  const activeNoteId = useMemo(() => {
    const m = location.pathname.match(/^\/notes\/([^/]+)$/);
    return m ? m[1] : null;
  }, [location.pathname]);

  const activeNote = useMemo(
    () => activeNoteId ? notes.find((n) => n.id === activeNoteId) ?? null : null,
    [activeNoteId, notes],
  );

  // Tag/folder filtering — local UI state for sidebar
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      try { for (const t of JSON.parse(n.tags) as string[]) set.add(t); } catch {}
    }
    return [...set].sort();
  }, [notes]);

  const allFolders = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) { if (n.folder) set.add(n.folder); }
    return [...set].sort();
  }, [notes]);

  const handleDeleteNote = async (id: string) => {
    const title = notes.find((n) => n.id === id)?.title || "Note";
    await remove(id);
    if (activeNoteId === id) navigate({ to: "/" });
    ui.setToast({
      message: `"${title}" moved to Trash`,
      action: {
        label: "Undo",
        onClick: async () => {
          await restore(id);
          navigate({ to: "/notes/$id", params: { id } });
        },
      },
    });
  };

  const handleCreateNote = async () => {
    const note = await create();
    navigate({ to: "/notes/$id", params: { id: note.id } });
  };

  const handleCreateWithTitle = async (title: string) => {
    const note = await create({ title, content: `# ${title}\n\n` });
    navigate({ to: "/notes/$id", params: { id: note.id } });
  };

  const handleDuplicateNote = async () => {
    if (!activeNote) return;
    const full = await fetch(`/api/notes/${activeNote.id}`).then((r) => r.json());
    const note = await create({ title: `${activeNote.title} (copy)`, content: full.note.content });
    navigate({ to: "/notes/$id", params: { id: note.id } });
  };

  const handleMoveToFolder = async (folder: string | null) => {
    if (!activeNote) return;
    await move(activeNote.id, folder);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportFiles = async (files: FileList | File[]) => {
    let lastNote = null;
    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".md") && !file.name.endsWith(".markdown") && !file.name.endsWith(".txt")) continue;
      const content = await file.text();
      const title = file.name.replace(/\.(md|markdown|txt)$/, "");
      lastNote = await create({ title, content });
    }
    if (lastNote) navigate({ to: "/notes/$id", params: { id: lastNote.id } });
  };

  const isPinned = activeNote ? !!activeNote.pinned : false;

  // Mode switcher state lives here so the palette can switch modes from any route
  // (we'll use a custom event the note route listens for)
  const setEditorMode = (mode: "richtext" | "markdown" | "split") => {
    document.dispatchEvent(new CustomEvent("editor-mode", { detail: mode }));
  };
  const clearDoneTasksAction = () => {
    document.dispatchEvent(new CustomEvent("clear-done-tasks"));
  };

  const paletteActions: PaletteAction[] = [
    { id: "new-note", label: "New note", icon: <FilePlus size={15} />, category: "action", onSelect: handleCreateNote },
    { id: "daily-note", label: "Open today's daily note", icon: <CalendarDays size={15} />, category: "action", onSelect: openDailyNote },
    { id: "duplicate-note", label: "Duplicate note", icon: <Copy size={15} />, category: "action", onSelect: handleDuplicateNote },
    ...(activeNote ? [
      { id: "toggle-pin", label: isPinned ? "Unpin note" : "Pin note", icon: <Pin size={15} />, category: "action" as const, onSelect: () => pin(activeNote.id, !isPinned) },
      { id: "move-to-folder", label: "Move to folder", icon: <FolderInput size={15} />, category: "action" as const, onSelect: () => ui.setFolderModalOpen(true) },
      { id: "version-history", label: "Version history", icon: <History size={15} />, category: "action" as const, onSelect: () => navigate({ to: "/notes/$id/versions", params: { id: activeNote.id } }) },
      { id: "delete-note", label: "Delete note", icon: <Trash2 size={15} />, category: "action" as const, onSelect: () => handleDeleteNote(activeNote.id) },
      { id: "clear-done", label: "Clear done tasks", icon: <Trash2 size={15} />, category: "action" as const, onSelect: clearDoneTasksAction },
    ] : []),
    { id: "import-md", label: "Import markdown", icon: <Upload size={15} />, category: "action", onSelect: () => fileInputRef.current?.click() },
    { id: "go-home", label: "Go home", icon: <Home size={15} />, category: "action", onSelect: () => navigate({ to: "/" }) },
    { id: "mode-richtext", label: "Rich text mode", icon: <Type size={15} />, category: "action", onSelect: () => setEditorMode("richtext") },
    { id: "mode-markdown", label: "Markdown mode", icon: <Code size={15} />, category: "action", onSelect: () => setEditorMode("markdown") },
    { id: "mode-split", label: "Split view", icon: <Columns2 size={15} />, category: "action", onSelect: () => setEditorMode("split") },
    { id: "focus-mode", label: "Focus mode", icon: <Maximize size={15} />, category: "action", onSelect: () => ui.setFocusMode(true) },
    { id: "toggle-sidebar", label: "Toggle sidebar", icon: <PanelLeftClose size={15} />, category: "action", onSelect: () => ui.setSidebarOpen((o) => !o) },
    { id: "trash", label: "Trash", icon: <Trash2 size={15} />, category: "action", onSelect: () => navigate({ to: "/trash" }) },
    { id: "settings", label: "Settings", icon: <Settings size={15} />, category: "action", onSelect: () => ui.setSettingsOpen(true) },
  ];

  return (
    <div className="flex h-full">
      <div className={`flex h-full transition-opacity duration-200 ${ui.focusMode ? "opacity-0 pointer-events-none w-0 overflow-hidden" : "opacity-100"}`}>
        <Sidebar
          notes={notes}
          activeNoteId={activeNoteId}
          onSelectNote={(id) => navigate({ to: "/notes/$id", params: { id } })}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
          onCollapse={() => ui.setSidebarOpen(false)}
          onHome={() => navigate({ to: "/" })}
          onOpenSettings={() => ui.setSettingsOpen(true)}
          onOpenTrash={() => navigate({ to: "/trash" })}
          onTogglePin={(id) => {
            const note = notes.find((n) => n.id === id);
            if (note) pin(id, !note.pinned);
          }}
          userEmail={user?.email ?? null}
          open={ui.sidebarOpen && !ui.focusMode}
          saveStatus="saved"
          allTags={allTags}
          selectedTag={null}
          onSelectTag={() => {}}
        />
      </div>

      <main className="relative flex flex-1 justify-center overflow-y-auto bg-surface">
        <div className={`transition-opacity duration-200 ${ui.focusMode ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          {!ui.sidebarOpen && (
            <button
              onClick={() => ui.setSidebarOpen(true)}
              title="Open sidebar"
              className="fixed top-3 left-3 z-10 flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
        </div>

        {ui.focusMode && <FocusOverlay onExit={() => ui.setFocusMode(false)} />}

        <Outlet />
      </main>

      <CommandPalette
        open={ui.paletteOpen}
        onClose={() => ui.setPaletteOpen(false)}
        notes={notes}
        actions={paletteActions}
        onSelectNote={(id) => navigate({ to: "/notes/$id", params: { id } })}
        onCreateWithTitle={handleCreateWithTitle}
      />

      <SettingsModal
        open={ui.settingsOpen}
        onClose={() => ui.setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        userEmail={user?.email ?? null}
      />
      <MoveToFolderModal
        open={ui.folderModalOpen}
        onClose={() => ui.setFolderModalOpen(false)}
        onSelect={handleMoveToFolder}
        currentFolder={activeNote?.folder ?? null}
        allFolders={allFolders}
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
      {ui.toast && <Toast message={ui.toast.message} action={ui.toast.action} onDismiss={() => ui.setToast(null)} />}
    </div>
  );
}
