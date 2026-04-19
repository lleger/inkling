import { Plus, PanelLeftClose, X, Home, Settings, Trash2, Pin, Folder, FolderOpen } from "lucide-react";
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
  allFolders: string[];
  selectedFolder: string | null;
  onSelectFolder: (folder: string | null) => void;
  userEmail: string | null;
  open: boolean;
  saveStatus: SaveStatus;
  allTags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
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
  allFolders,
  selectedFolder,
  onSelectFolder,
  userEmail,
  open,
  allTags,
  selectedTag,
  onSelectTag,
  saveStatus,
}: SidebarProps) {
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

      {(allFolders.length > 0 || allTags.length > 0) && (
        <div className="flex flex-col gap-1.5 px-3 py-2 border-b border-border">
          {allFolders.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {allFolders.map((folder) => {
                const name = folder.split("/").pop() || folder;
                const depth = folder.split("/").length - 1;
                const isSelected = selectedFolder === folder;
                return (
                  <button
                    key={folder}
                    onClick={() => onSelectFolder(isSelected ? null : folder)}
                    className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] transition-colors ${
                      isSelected
                        ? "bg-accent/10 text-accent"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text"
                    }`}
                    style={{ paddingLeft: `${6 + depth * 12}px` }}
                  >
                    {isSelected ? <FolderOpen size={13} /> : <Folder size={13} />}
                    {name}
                  </button>
                );
              })}
            </div>
          )}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
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
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-1.5 py-1 flex flex-col gap-0.5">
        {notes.map((note, index) => {
          const isActive = note.id === activeNoteId;
          const showSeparator = note.pinned === 0 && index > 0 && notes[index - 1].pinned === 1;
          return (
            <div key={note.id}>
              {showSeparator && <div className="mx-2 my-1 h-px bg-border" />}
              <div
                className={`group relative flex items-center gap-2 cursor-pointer rounded-md px-2 py-2.5 transition-colors ${
                  isActive
                    ? "bg-surface-active text-text"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text"
                }`}
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
                  <Pin size={12} className="shrink-0 text-text-muted" />
                )}
                <span className="flex-1 truncate text-sm">
                  {note.title || "Untitled"}
                </span>
                <span className="shrink-0 text-[11px] text-text-muted transition-opacity group-hover:opacity-0">
                  {timeAgo(note.updated_at)}
                </span>
                <div className="absolute right-1.5 flex items-center gap-0.5 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto">
                  <button
                    className="flex size-6 items-center justify-center rounded-md text-text-muted hover:bg-surface-active hover:text-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(note.id);
                    }}
                    title={note.pinned ? "Unpin" : "Pin"}
                  >
                    <Pin size={12} className={note.pinned ? "text-accent" : ""} />
                  </button>
                  <button
                    className="flex size-6 items-center justify-center rounded-md text-text-muted hover:bg-surface-active hover:text-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    title="Delete"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
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
