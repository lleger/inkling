import { ContextMenu } from "@base-ui/react/context-menu";
import { useState, type ReactNode } from "react";
import {
  Plus,
  PanelLeftClose,
  X,
  Home,
  CalendarRange,
  Eraser,
  Settings,
  Trash2,
  Pin,
  ChevronRight,
  Paintbrush,
} from "lucide-react";
import { cx } from "../lib/cx";
import { renderFolderIcon } from "../lib/folder-icons";
import { addDays, dailyLabel, dailyTitle, findDailyNote } from "../lib/daily-notes";
import { findScratchNote, scratchFolder } from "../lib/scratch-notes";
import { saveStatusMeta } from "../lib/save-status";
import type { FolderMetadata, NoteMeta, SaveStatus } from "../types";

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

type SidebarContextMenuItem = {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
};

function SidebarContextMenu({
  trigger,
  items,
}: {
  trigger: ReactNode;
  items: SidebarContextMenuItem[];
}) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={<div />}>{trigger}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner sideOffset={4} collisionPadding={8} className="z-50">
          <ContextMenu.Popup className="min-w-36 rounded-lg border border-border bg-surface p-1 text-[13px] text-text shadow-xl outline-none animate-[scale-in_0.1s_ease-out]">
            {items.map((item, index) => (
              <ContextMenu.Item
                key={item.label}
                onClick={(event) => {
                  event.stopPropagation();
                  item.onSelect();
                }}
                className={cx(
                  "flex cursor-default items-center rounded-md px-2.5 py-1.5 outline-none transition-colors data-[highlighted]:bg-surface-hover",
                  index > 0 && item.destructive ? "mt-1 border-t border-border pt-2" : "",
                  item.destructive
                    ? "text-red-600 data-[highlighted]:bg-red-500/10"
                    : "text-text-secondary data-[highlighted]:text-text",
                )}
              >
                {item.label}
              </ContextMenu.Item>
            ))}
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function buildFolderTree(
  notes: NoteMeta[],
  excludedFolders: Set<string>,
): { tree: FolderTree[]; unfiled: NoteMeta[] } {
  const folders = new Map<string, FolderTree>();
  const unfiled: NoteMeta[] = [];

  // Collect all folder paths
  for (const note of notes) {
    if (note.folder && excludedFolders.has(note.folder)) continue;

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
  onOpenDailyDate: (date?: Date) => void;
  onOpenDailyNotes: () => void;
  onOpenScratchNote: () => void;
  onOpenSettings: () => void;
  onOpenTrash: () => void;
  onTogglePin: (id: string) => void;
  onMoveNote: (id: string) => void;
  onViewVersions: (id: string) => void;
  onDuplicateNote: (id: string) => void;
  allTags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  userEmail: string | null;
  open: boolean;
  saveStatus: SaveStatus;
  folderMetadata: Record<string, FolderMetadata>;
  onCustomizeFolder: (path: string) => void;
  onDeleteFolder: (path: string) => void;
  dailyNoteFolder: string;
}

export function Sidebar({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onCollapse,
  onHome,
  onOpenDailyDate,
  onOpenDailyNotes,
  onOpenScratchNote,
  onOpenSettings,
  onOpenTrash,
  onTogglePin,
  onMoveNote,
  onViewVersions,
  onDuplicateNote,
  allTags,
  selectedTag,
  onSelectTag,
  userEmail,
  open,
  saveStatus,
  folderMetadata,
  onCustomizeFolder,
  onDeleteFolder,
  dailyNoteFolder,
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["__all__"]));
  const { tree, unfiled } = buildFolderTree(notes, new Set([dailyNoteFolder, scratchFolder()]));

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
  const dailyDates = [new Date(), addDays(new Date(), -1), addDays(new Date(), -2)];
  const scratchNote = findScratchNote(notes);
  const isScratchActive = scratchNote?.id === activeNoteId;

  const renderScratchSection = () => (
    <div className="mx-1 my-1 rounded-lg border border-border bg-surface/60 p-1">
      <div
        onClick={() => onOpenScratchNote()}
        className={`group relative flex w-full min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors md:min-h-0 ${
          isScratchActive
            ? "bg-surface-active text-text"
            : "text-text-secondary hover:bg-surface-hover hover:text-text"
        }`}
      >
        {isScratchActive && (
          <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />
        )}
        <Eraser size={13} className="shrink-0 text-text-muted" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">Scratch</span>
        <span className="shrink-0 text-[11px] text-text-muted">⌘⇧X</span>
        {scratchNote && (
          <button
            type="button"
            title="Delete scratch note"
            className="flex size-7 shrink-0 items-center justify-center rounded text-text-muted opacity-100 transition-opacity hover:bg-surface-active hover:text-text md:size-5 md:opacity-0 md:group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote(scratchNote.id);
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );

  const renderDailySection = () => (
    <div className="mx-1 my-1 rounded-lg border border-border bg-surface/60 p-1">
      <div className="flex items-center justify-between px-2 py-1">
        <button
          onClick={() => onOpenDailyNotes()}
          className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted transition-colors hover:text-text-secondary"
        >
          <CalendarRange size={12} />
          <span>Daily</span>
        </button>
      </div>
      {dailyDates.map((date) => {
        const note = findDailyNote(notes, date, dailyNoteFolder);
        const isActive = note?.id === activeNoteId;
        return (
          <div
            key={dailyTitle(date)}
            onClick={() => onOpenDailyDate(date)}
            className={`group relative flex w-full min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors md:min-h-0 ${
              isActive
                ? "bg-surface-active text-text"
                : "text-text-secondary hover:bg-surface-hover hover:text-text"
            }`}
          >
            {isActive && (
              <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />
            )}
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {dailyLabel(date)}
            </span>
            <span className="shrink-0 text-[11px] text-text-muted">{dailyTitle(date)}</span>
            {note && (
              <button
                type="button"
                title="Delete"
                className="flex size-7 shrink-0 items-center justify-center rounded text-text-muted opacity-100 transition-opacity hover:bg-surface-active hover:text-text md:size-5 md:opacity-0 md:group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNote(note.id);
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderNoteItem = (note: NoteMeta, depth = 0) => {
    const isActive = note.id === activeNoteId;
    const saveMeta = saveStatusMeta(saveStatus);
    const noteItem = (
      <div
        className={`group relative flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-2 transition-colors md:min-h-0 ${
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
            className={`shrink-0 size-1.5 rounded-full ${saveMeta.dotClassName}`}
            title={saveMeta.label}
          />
        )}
        {note.pinned === 1 && <Pin size={11} className="shrink-0 text-text-muted" />}
        <span className="flex-1 truncate pr-16 text-[13px] md:pr-0">
          {note.title || "Untitled"}
        </span>
        <span className="hidden shrink-0 text-[11px] text-text-muted transition-opacity group-hover:opacity-0 md:inline">
          {timeAgo(note.updated_at)}
        </span>
        <div className="absolute right-1.5 flex items-center gap-0.5 opacity-100 transition-opacity md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100">
          <button
            className="flex size-8 items-center justify-center rounded text-text-muted hover:bg-surface-active hover:text-text md:size-5"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(note.id);
            }}
            title={note.pinned ? "Unpin" : "Pin"}
          >
            <Pin size={11} className={note.pinned ? "text-accent" : ""} />
          </button>
          <button
            className="flex size-8 items-center justify-center rounded text-text-muted hover:bg-surface-active hover:text-text md:size-5"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote(note.id);
            }}
            title="Delete"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    );

    return (
      <SidebarContextMenu
        key={note.id}
        trigger={noteItem}
        items={[
          { label: "Open", onSelect: () => onSelectNote(note.id) },
          { label: note.pinned ? "Unpin" : "Pin", onSelect: () => onTogglePin(note.id) },
          { label: "Move to folder", onSelect: () => onMoveNote(note.id) },
          { label: "View versions", onSelect: () => onViewVersions(note.id) },
          { label: "Duplicate", onSelect: () => onDuplicateNote(note.id) },
          { label: "Delete", onSelect: () => onDeleteNote(note.id), destructive: true },
        ]}
      />
    );
  };

  const renderFolder = (folder: FolderTree, depth = 0) => {
    const isExpanded =
      expandedFolders.has(folder.path) ||
      (activeFolder !== undefined && activeFolder !== null && activeFolder.startsWith(folder.path));
    const hasContent = folder.notes.length > 0 || folder.children.length > 0;
    const folderRow = (
      <div className="group flex min-h-10 items-center rounded-md text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text md:min-h-0">
        <button
          onClick={() => toggleFolder(folder.path)}
          className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-left"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <ChevronRight
            size={12}
            className={`shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
          {renderFolderIcon(folderMetadata[folder.path], isExpanded)}
          <span className="truncate">{folder.name}</span>
          {hasContent && (
            <span className="ml-auto text-[10px] text-text-muted">{folder.notes.length}</span>
          )}
        </button>
        <button
          onClick={() => onCustomizeFolder(folder.path)}
          className="mr-1 flex size-8 shrink-0 items-center justify-center rounded text-text-muted opacity-100 transition-opacity hover:bg-surface-active hover:text-text md:size-5 md:opacity-0 md:group-hover:opacity-100"
          title={`Customize ${folder.name} icon`}
        >
          <Paintbrush size={11} />
        </button>
      </div>
    );

    return (
      <div key={folder.path}>
        <SidebarContextMenu
          trigger={folderRow}
          items={[
            { label: "Customize icon", onSelect: () => onCustomizeFolder(folder.path) },
            {
              label: "Delete folder",
              onSelect: () => onDeleteFolder(folder.path),
              destructive: true,
            },
          ]}
        />
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
      className={`fixed inset-y-0 left-0 z-30 flex w-[min(18rem,82vw)] shrink-0 flex-col border-r border-border bg-surface-secondary transition-transform duration-200 ease-out lg:relative lg:z-auto lg:w-56 lg:shadow-none ${
        open
          ? "translate-x-0 shadow-2xl"
          : "-translate-x-full lg:-translate-x-56 lg:absolute lg:top-0 lg:bottom-0"
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
            className="flex size-9 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary md:size-7"
            onClick={onCreateNote}
            title="New note"
          >
            <Plus size={15} />
          </button>
          <button
            className="flex size-9 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary md:size-7"
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
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 py-1">
        {/* Pinned notes at top */}
        {hasPinned && (
          <>
            {pinnedNotes.map((note) => renderNoteItem(note))}
            <div className="mx-2 my-1 h-px bg-border" />
          </>
        )}

        {renderDailySection()}
        {renderScratchSection()}

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
          <span className="min-w-0 truncate text-[11px] text-text-muted">{userEmail}</span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-0.5">
          <button
            className="flex size-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary md:size-7"
            onClick={onOpenTrash}
            title="Trash"
          >
            <Trash2 size={14} />
          </button>
          <button
            className="flex size-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary md:size-7"
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
