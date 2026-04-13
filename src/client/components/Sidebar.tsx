import { Plus, PanelLeftClose, X, Home, Settings } from "lucide-react";
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

      <div className="flex-1 overflow-y-auto px-1.5 py-1 flex flex-col gap-0.5">
        {notes.map((note) => {
          const isActive = note.id === activeNoteId;
          return (
            <div
              key={note.id}
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
              <span className="flex-1 truncate text-sm">
                {note.title || "Untitled"}
              </span>
              <span className="shrink-0 text-[11px] text-text-muted transition-opacity group-hover:opacity-0">
                {timeAgo(note.updated_at)}
              </span>
              <button
                className="absolute right-1.5 shrink-0 flex size-6 items-center justify-center rounded-md text-text-muted opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-surface-active hover:text-text"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNote(note.id);
                }}
                title="Delete"
              >
                <X size={13} />
              </button>
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
        <button
          className="flex size-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings size={14} />
        </button>
      </div>
    </aside>
  );
}
