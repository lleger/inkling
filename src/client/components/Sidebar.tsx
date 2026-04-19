import { useState } from "react";
import { Plus, PanelLeftClose, X, Home, Settings, Trash2, Pin, Folder, FolderOpen, ChevronRight } from "lucide-react";
import type { NoteMeta, SaveStatus } from "../types";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

interface FolderTree {
  name: string;
  path: string;
  notes: NoteMeta[];
  children: FolderTree[];
}

function buildFolderTree(notes: NoteMeta[]): { tree: FolderTree[]; unfiled: NoteMeta[] } {
  const folders = new Map<string, FolderTree>();
  const unfiled: NoteMeta[] = [];

  // Collect all folder paths
  for (const note of notes) {
    if (!note.folder) {
      unfiled.push(note);
      continue;
    }

    // Ensure all ancestor folders exist
    const parts = note.folder.split("/");
    for (let i = 0; i < parts.length; i++) {
      const path = parts.slice(0, i + 1).join("/");
      if (!folders.has(path)) {
        folders.set(path, { name: parts[i], path, notes: [], children: [] });
      }
    }

    folders.get(note.folder)!.notes.push(note);
  }

  // Build tree structure
  const roots: FolderTree[] = [];
  for (const folder of folders.values()) {
    const parentPath = folder.path.includes("/")
      ? folder.path.slice(0, folder.path.lastIndexOf("/"))
      : null;
    if (parentPath && folders.has(parentPath)) {
      folders.get(parentPath)!.children.push(folder);
    } else {
      roots.push(folder);
    }
  }

  return { tree: roots, unfiled };
}

interface SidebarProps {
  notes: NoteMeta[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  onCollapse: () => void;
  onHome: () => void;
  onOpenSettings: () => void;
  onOpenTrash: () => void;
  onTogglePin: (id: string) => void;
  allTags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  userEmail: string | null;
  open: boolean;
  saveStatus: SaveStatus;
}

export function Sidebar({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onCollapse,
  onHome,
  onOpenSettings,
  onOpenTrash,
  onTogglePin,
  allTags,
  selectedTag,
  onSelectTag,
  userEmail,
  open,
  saveStatus,
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["__all__"]));
  const { tree, unfiled } = buildFolderTree(notes);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Auto-expand folder containing active note
  const activeFolder = notes.find((n) => n.id === activeNoteId)?.folder;

  const renderNoteItem = (note: NoteMeta, depth = 0) => {
    const isActive = note.id === activeNoteId;
    return (
      <div
        key={note.id}
        className={`group relative flex items-center gap-2 cursor-pointer rounded-md px-2 py-2 transition-colors ${
          isActive
            ? "bg-surface-active text-text"
            : "text-text-secondary hover:bg-surface-hover hover:text-text"
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelectNote(note.id)}
      >
        {isActive && (
          <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />
        )}
        {isActive && saveStatus !== "saved" && (
          <div
            className={`shrink-0 size-1.5 rounded-full ${
              saveStatus === "saving" ? "bg-accent animate-pulse" : "bg-text-muted animate-pulse"
            }`}
            title={saveStatus === "saving" ? "Saving..." : "Unsaved changes"}
          />
        )}
        {note.pinned === 1 && (
          <Pin size={11} className="shrink-0 text-text-muted" />
        )}
        <span className="flex-1 truncate text-[13px]">
          {note.title || "Untitled"}
        </span>
        <span className="shrink-0 text-[11px] text-text-muted transition-opacity group-hover:opacity-0">
          {timeAgo(note.updated_at)}
        </span>
        <div className="absolute right-1.5 flex items-center gap-0.5 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto">
          <button
            className="flex size-5 items-center justify-center rounded text-text-muted hover:bg-surface-active hover:text-text"
            onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
            title={note.pinned ? "Unpin" : "Pin"}
          >
            <Pin size={11} className={note.pinned ? "text-accent" : ""} />
          </button>
          <button
            className="flex size-5 items-center justify-center rounded text-text-muted hover:bg-surface-active hover:text-text"
            onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
            title="Delete"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    );
  };

  const renderFolder = (folder: FolderTree, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.path) ||
      (activeFolder !== undefined && activeFolder !== null && activeFolder.startsWith(folder.path));
    const hasContent = folder.notes.length > 0 || folder.children.length > 0;

    return (
      <div key={folder.path}>
        <button
          onClick={() => toggleFolder(folder.path)}
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <ChevronRight
            size={12}
            className={`shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
          {isExpanded ? <FolderOpen size={13} className="shrink-0" /> : <Folder size={13} className="shrink-0" />}
          <span className="truncate">{folder.name}</span>
          {hasContent && (
            <span className="ml-auto text-[10px] text-text-muted">{folder.notes.length}</span>
          )}
        </button>
        {isExpanded && (
          <div>
            {folder.children.map((child) => renderFolder(child, depth + 1))}
            {folder.notes.map((note) => renderNoteItem(note, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Separate pinned notes (shown at top regardless of folder)
  const pinnedNotes = notes.filter((n) => n.pinned === 1);
  const hasPinned = pinnedNotes.length > 0;

  return (
    <aside
      className={`w-56 shrink-0 flex flex-col border-r border-border bg-surface-secondary transition-all duration-200 ease-out ${
        open ? "translate-x-0" : "-translate-x-56 absolute top-0 left-0 bottom-0 z-10"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <button
          className="flex size-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
          onClick={onHome}
          title="Home"
        >
          <Home size={16} />
        </button>
        <div className="flex items-center gap-0.5 rounded-md bg-surface p-0.5">
          <button
            className="flex size-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
            onClick={onCreateNote}
            title="New note"
          >
            <Plus size={15} />
          </button>
          <button
            className="flex size-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
            onClick={onCollapse}
            title="Collapse sidebar"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-border">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                selectedTag === tag
                  ? "bg-accent text-white"
                  : "bg-surface-tertiary text-text-secondary hover:text-text"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Note list with folders */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1 flex flex-col gap-0.5">
        {/* Pinned notes at top */}
        {hasPinned && (
          <>
            {pinnedNotes.map((note) => renderNoteItem(note))}
            <div className="mx-2 my-1 h-px bg-border" />
          </>
        )}

        {/* Folders */}
        {tree.map((folder) => renderFolder(folder))}

        {/* Unfiled notes */}
        {unfiled.filter((n) => !n.pinned).map((note) => renderNoteItem(note))}

        {notes.length === 0 && (
          <div className="px-2 py-8 text-center text-xs text-text-muted">No notes yet</div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        {userEmail ? (
          <span className="truncate text-[11px] text-text-muted">{userEmail}</span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-0.5">
          <button
            className="flex size-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
            onClick={onOpenTrash}
            title="Trash"
          >
            <Trash2 size={14} />
          </button>
          <button
            className="flex size-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
            onClick={onOpenSettings}
            title="Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
