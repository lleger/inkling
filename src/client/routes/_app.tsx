import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { SettingsModal } from "../components/SettingsModal";
import { FocusOverlay } from "../components/FocusOverlay";
import { MoveToFolderModal } from "../components/MoveToFolderModal";
import { FolderIconPickerModal } from "../components/FolderIconPickerModal";
import { CommandPalette, type PaletteAction } from "../components/CommandPalette";
import {
  PanelLeftOpen,
  FilePlus,
  Copy,
  Settings,
  Home,
  Upload,
  Trash2,
  Pin,
  History,
  FolderInput,
  Type,
  Code,
  Columns2,
  Maximize,
  PanelLeftClose,
  CalendarDays,
  CalendarRange,
  Eraser,
} from "lucide-react";
import { useNotes } from "../hooks/useNotes";
import { useUser } from "../hooks/useUser";
import { useTheme } from "../hooks/useTheme";
import { useSettings } from "../hooks/useSettings";
import { useDailyNote } from "../hooks/useDailyNote";
import { useScratchNote } from "../hooks/useScratchNote";
import { useFolderMetadata } from "../hooks/useFolderMetadata";
import { applyAccent } from "../lib/accent-colors";
import { dailyFolder } from "../lib/daily-notes";
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
  const { folders: folderMetadata, setIcon: setFolderIcon } = useFolderMetadata();
  const user = useUser();
  const { settings, update: updateSettings } = useSettings();
  const theme = useTheme(settings.theme);
  const { openDailyNote } = useDailyNote();
  const { openScratchNote } = useScratchNote();
  const [iconFolderPath, setIconFolderPath] = useState<string | null>(null);

  // Apply accent
  useEffect(() => {
    applyAccent(settings.accent, theme);
  }, [settings.accent, theme]);

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

  // Cmd+Shift+X — open scratch note
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        openScratchNote();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openScratchNote]);

  // Derive active note from URL
  const activeNoteId = useMemo(() => {
    const m = location.pathname.match(/^\/notes\/([^/]+)$/);
    return m ? m[1] : null;
  }, [location.pathname]);

  const activeNote = useMemo(
    () => (activeNoteId ? (notes.find((n) => n.id === activeNoteId) ?? null) : null),
    [activeNoteId, notes],
  );

  // Tag/folder filtering — local UI state for sidebar
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      try {
        for (const t of JSON.parse(n.tags) as string[]) set.add(t);
      } catch {}
    }
    return [...set].sort();
  }, [notes]);

  const allFolders = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      if (n.folder) set.add(n.folder);
    }
    return [...set].sort();
  }, [notes]);

  const folderMetadataByPath = useMemo(
    () => Object.fromEntries(folderMetadata.map((folder) => [folder.path, folder])),
    [folderMetadata],
  );

  const handleDeleteNote = async (id: string) => {
    const title = notes.find((n) => n.id === id)?.title || "Note";
    if (activeNoteId === id) await navigate({ to: "/" });
    await remove(id);
    ui.showToast({
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
    closeSidebarOnMobile();
  };

  const handleCreateWithTitle = async (title: string) => {
    const note = await create({ title, content: `# ${title}\n\n` });
    navigate({ to: "/notes/$id", params: { id: note.id } });
    closeSidebarOnMobile();
  };

  const handleDuplicateNote = async () => {
    if (!activeNote) return;
    const title = activeNote.title || "Untitled";
    const full = await fetch(`/api/notes/${activeNote.id}`).then(
      (r) => r.json() as Promise<{ note: { content: string } }>,
    );
    const note = await create({ title: `${title} (copy)`, content: full.note.content });
    navigate({ to: "/notes/$id", params: { id: note.id } });
    ui.showToast({ message: `Duplicated "${title}"` });
  };

  const handleMoveToFolder = async (folder: string | null) => {
    if (!activeNote) return;
    await move(activeNote.id, folder);
    ui.showToast({ message: folder ? `Moved to "${folder}"` : "Removed from folder" });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportFiles = async (files: FileList | File[]) => {
    let lastNote = null;
    let imported = 0;
    for (const file of Array.from(files)) {
      if (
        !file.name.endsWith(".md") &&
        !file.name.endsWith(".markdown") &&
        !file.name.endsWith(".txt")
      )
        continue;
      const content = await file.text();
      const title = file.name.replace(/\.(md|markdown|txt)$/, "");
      lastNote = await create({ title, content });
      imported++;
    }
    if (lastNote) {
      navigate({ to: "/notes/$id", params: { id: lastNote.id } });
      ui.showToast({
        message: `Imported ${imported} ${imported === 1 ? "note" : "notes"}`,
      });
    } else {
      ui.showToast({ message: "No supported files selected" });
    }
  };

  const isPinned = activeNote ? !!activeNote.pinned : false;

  const closeSidebarOnMobile = () => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      ui.setSidebarOpen(false);
    }
  };

  const selectNote = (id: string) => {
    navigate({ to: "/notes/$id", params: { id } });
    closeSidebarOnMobile();
  };

  const goHome = () => {
    navigate({ to: "/" });
    closeSidebarOnMobile();
  };

  const goTrash = () => {
    navigate({ to: "/trash" });
    closeSidebarOnMobile();
  };

  const goDailyNotes = () => {
    navigate({ to: "/daily" });
    closeSidebarOnMobile();
  };

  const handleOpenDailyDate = async (date?: Date) => {
    await openDailyNote(date);
    closeSidebarOnMobile();
  };

  const handleOpenScratchNote = async () => {
    await openScratchNote();
    closeSidebarOnMobile();
  };

  const openSettings = () => {
    ui.setSettingsOpen(true);
    closeSidebarOnMobile();
  };

  // Mode switcher state lives here so the palette can switch modes from any route
  // (we'll use a custom event the note route listens for)
  const setEditorMode = (mode: "richtext" | "markdown" | "split") => {
    document.dispatchEvent(new CustomEvent("editor-mode", { detail: mode }));
  };
  const clearDoneTasksAction = () => {
    document.dispatchEvent(new CustomEvent("clear-done-tasks"));
  };

  const paletteActions: PaletteAction[] = [
    {
      id: "new-note",
      label: "New note",
      icon: <FilePlus size={15} />,
      category: "action",
      onSelect: handleCreateNote,
    },
    {
      id: "daily-note",
      label: "Open today's daily note",
      icon: <CalendarDays size={15} />,
      category: "action",
      onSelect: openDailyNote,
    },
    {
      id: "daily-notes",
      label: "Browse daily notes",
      icon: <CalendarRange size={15} />,
      category: "action",
      onSelect: () => navigate({ to: "/daily" }),
    },
    {
      id: "scratch-note",
      label: "Open scratch note",
      icon: <Eraser size={15} />,
      category: "action",
      onSelect: openScratchNote,
    },
    {
      id: "duplicate-note",
      label: "Duplicate note",
      icon: <Copy size={15} />,
      category: "action",
      onSelect: handleDuplicateNote,
    },
    ...(activeNote
      ? [
          {
            id: "toggle-pin",
            label: isPinned ? "Unpin note" : "Pin note",
            icon: <Pin size={15} />,
            category: "action" as const,
            onSelect: () => pin(activeNote.id, !isPinned),
          },
          {
            id: "move-to-folder",
            label: "Move to folder",
            icon: <FolderInput size={15} />,
            category: "action" as const,
            onSelect: () => ui.setFolderModalOpen(true),
          },
          {
            id: "version-history",
            label: "Version history",
            icon: <History size={15} />,
            category: "action" as const,
            onSelect: () => navigate({ to: "/notes/$id/versions", params: { id: activeNote.id } }),
          },
          {
            id: "delete-note",
            label: "Delete note",
            icon: <Trash2 size={15} />,
            category: "action" as const,
            onSelect: () => handleDeleteNote(activeNote.id),
          },
          {
            id: "clear-done",
            label: "Clear done tasks",
            icon: <Trash2 size={15} />,
            category: "action" as const,
            onSelect: clearDoneTasksAction,
          },
        ]
      : []),
    {
      id: "import-md",
      label: "Import markdown",
      icon: <Upload size={15} />,
      category: "action",
      onSelect: () => fileInputRef.current?.click(),
    },
    {
      id: "go-home",
      label: "Go home",
      icon: <Home size={15} />,
      category: "action",
      onSelect: () => navigate({ to: "/" }),
    },
    {
      id: "mode-richtext",
      label: "Rich text mode",
      icon: <Type size={15} />,
      category: "action",
      onSelect: () => setEditorMode("richtext"),
    },
    {
      id: "mode-markdown",
      label: "Markdown mode",
      icon: <Code size={15} />,
      category: "action",
      onSelect: () => setEditorMode("markdown"),
    },
    {
      id: "mode-split",
      label: "Split view",
      icon: <Columns2 size={15} />,
      category: "action",
      onSelect: () => setEditorMode("split"),
    },
    {
      id: "focus-mode",
      label: "Focus mode",
      icon: <Maximize size={15} />,
      category: "action",
      onSelect: () => ui.setFocusMode(true),
    },
    {
      id: "toggle-sidebar",
      label: "Toggle sidebar",
      icon: <PanelLeftClose size={15} />,
      category: "action",
      onSelect: () => ui.setSidebarOpen((o) => !o),
    },
    {
      id: "trash",
      label: "Trash",
      icon: <Trash2 size={15} />,
      category: "action",
      onSelect: () => navigate({ to: "/trash" }),
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings size={15} />,
      category: "action",
      onSelect: () => ui.setSettingsOpen(true),
    },
  ];

  return (
    <div className="flex h-full min-w-0 overflow-hidden">
      {ui.sidebarOpen && !ui.focusMode && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-20 bg-surface-overlay md:hidden"
          onClick={() => ui.setSidebarOpen(false)}
        />
      )}
      <div
        className={`flex h-full transition-opacity duration-200 ${ui.focusMode ? "opacity-0 pointer-events-none w-0 overflow-hidden" : "opacity-100"}`}
      >
        <Sidebar
          notes={notes}
          activeNoteId={activeNoteId}
          onSelectNote={selectNote}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
          onCollapse={() => ui.setSidebarOpen(false)}
          onHome={goHome}
          onOpenDailyDate={handleOpenDailyDate}
          onOpenDailyNotes={goDailyNotes}
          onOpenScratchNote={handleOpenScratchNote}
          onOpenSettings={openSettings}
          onOpenTrash={goTrash}
          onTogglePin={(id) => {
            const note = notes.find((n) => n.id === id);
            if (note) pin(id, !note.pinned);
          }}
          userEmail={user?.email ?? null}
          open={ui.sidebarOpen && !ui.focusMode}
          saveStatus={ui.saveStatus}
          allTags={allTags}
          selectedTag={null}
          onSelectTag={() => {}}
          folderMetadata={folderMetadataByPath}
          onCustomizeFolder={setIconFolderPath}
          dailyNoteFolder={dailyFolder(settings)}
        />
      </div>

      <main className="relative flex min-w-0 flex-1 justify-center overflow-y-auto bg-surface">
        <div
          className={`transition-opacity duration-200 ${ui.focusMode ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        >
          {!ui.sidebarOpen && (
            <button
              onClick={() => ui.setSidebarOpen(true)}
              title="Open sidebar"
              className="fixed top-3 left-3 z-10 flex size-9 items-center justify-center rounded-md bg-surface-secondary/80 text-text-muted shadow-sm ring-1 ring-border backdrop-blur-sm transition-colors hover:bg-surface-hover hover:text-text-secondary md:size-8 md:bg-transparent md:shadow-none md:ring-0"
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
        onSelectNote={selectNote}
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
      <FolderIconPickerModal
        open={iconFolderPath !== null}
        folderPath={iconFolderPath}
        current={iconFolderPath ? folderMetadataByPath[iconFolderPath] : undefined}
        onClose={() => setIconFolderPath(null)}
        onSave={async (icon) => {
          if (!iconFolderPath) return;
          await setFolderIcon(iconFolderPath, icon);
          setIconFolderPath(null);
        }}
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
    </div>
  );
}
