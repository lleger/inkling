import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { X, History, FolderClosed, Hash, Calendar, FileText } from "lucide-react";
import type { Note } from "../types";
import { useUI } from "../context/UIContext";

interface MetaPanelProps {
  note: Note;
  wordCount: number;
  taskStats: { done: number; total: number } | null;
}

export function MetaPanel({ note, wordCount, taskStats }: MetaPanelProps) {
  const ui = useUI();

  // Close on Escape
  useEffect(() => {
    if (!ui.metaPanelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        ui.setMetaPanelOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [ui]);

  const tags = parseTagsField(note.tags);

  return (
    <aside
      className={`fixed top-0 right-0 z-20 flex h-full w-80 flex-col border-l border-border bg-surface shadow-lg transition-transform duration-200 ${
        ui.metaPanelOpen ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!ui.metaPanelOpen}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text">Note details</h2>
        <button
          type="button"
          onClick={() => ui.setMetaPanelOpen(false)}
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          title="Close (Esc)"
          aria-label="Close panel"
        >
          <X size={15} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 text-sm">
        <Section title="Title">
          <div className="line-clamp-3 text-text">{note.title || "Untitled"}</div>
        </Section>

        <Section title="Stats">
          <Row icon={<FileText size={13} />} label="Words">
            {wordCount.toLocaleString()}
          </Row>
          {taskStats && (
            <Row icon={<FileText size={13} />} label="Tasks">
              {taskStats.done}/{taskStats.total} done
            </Row>
          )}
        </Section>

        <Section title="Organization">
          <Row icon={<FolderClosed size={13} />} label="Folder">
            <span className={note.folder ? "text-text" : "text-text-muted"}>
              {note.folder || "—"}
            </span>
          </Row>
          <Row icon={<Hash size={13} />} label="Tags">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span key={t} className="rounded bg-surface-secondary px-1.5 py-0.5 text-[11px] text-text-secondary">
                    #{t}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-text-muted">—</span>
            )}
          </Row>
        </Section>

        <Section title="History">
          <Row icon={<Calendar size={13} />} label="Created">
            <span className="text-text">{formatDate(note.created_at)}</span>
          </Row>
          <Row icon={<Calendar size={13} />} label="Updated">
            <span className="text-text">{formatDate(note.updated_at)}</span>
          </Row>
          <div className="mt-2">
            <Link
              to="/notes/$id/versions"
              params={{ id: note.id }}
              onClick={() => ui.setMetaPanelOpen(false)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[12px] text-text-secondary no-underline transition-colors hover:border-accent/40 hover:text-accent"
            >
              <History size={12} />
              View version history
            </Link>
          </div>
        </Section>

        <Section title="Backlinks">
          <div className="text-text-muted text-[12px]">
            {/* Populated in slice 3 */}
            No backlinks yet.
          </div>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-[12px]">
      <span className="mt-0.5 flex w-16 flex-shrink-0 items-center gap-1.5 text-text-muted">
        {icon}
        {label}
      </span>
      <span className="flex-1 min-w-0">{children}</span>
    </div>
  );
}

function parseTagsField(tagsField: string): string[] {
  try {
    const parsed = JSON.parse(tagsField);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
