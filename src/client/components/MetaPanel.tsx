import { Drawer } from "@base-ui/react/drawer";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { X, History, FolderClosed, Hash, Calendar, FileText } from "lucide-react";
import type { Note } from "../types";
import { useUI } from "../context/UIContext";
import { backlinksQuery } from "../lib/queries";
import { IconButton } from "./ui/IconButton";

interface MetaPanelProps {
  note: Note;
  wordCount: number;
  taskStats: { done: number; total: number } | null;
}

export function MetaPanel({ note, wordCount, taskStats }: MetaPanelProps) {
  const ui = useUI();
  const { data: backlinks } = useQuery({
    ...backlinksQuery(note.id),
    enabled: ui.metaPanelOpen, // only fetch when panel is open
  });

  const tags = parseTagsField(note.tags);

  return (
    <Drawer.Root
      open={ui.metaPanelOpen}
      onOpenChange={(open) => ui.setMetaPanelOpen(open)}
      swipeDirection="down"
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-surface-overlay animate-[fade-in_0.1s_ease-out] sm:hidden" />
        <Drawer.Viewport className="fixed inset-0 z-40 flex items-end justify-center sm:block">
          <Drawer.Popup className="flex max-h-[min(85dvh,36rem)] w-full flex-col rounded-t-xl border border-b-0 border-border bg-surface shadow-2xl animate-[scale-in_0.1s_ease-out] sm:absolute sm:inset-y-0 sm:right-0 sm:h-full sm:max-h-none sm:w-[min(100vw,22rem)] sm:rounded-none sm:border-y-0 sm:border-r-0 sm:border-l sm:shadow-lg">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <Drawer.Title className="text-sm font-semibold text-text">Note details</Drawer.Title>
              <Drawer.Close
                render={<IconButton buttonSize="sm" aria-label="Close panel" title="Close (Esc)" />}
              >
                <X size={15} />
              </Drawer.Close>
            </header>

            <Drawer.Content className="flex-1 overflow-y-auto px-4 py-3 text-sm">
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
                        <span
                          key={t}
                          className="rounded bg-surface-secondary px-1.5 py-0.5 text-[11px] text-text-secondary"
                        >
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
                {backlinks && backlinks.length > 0 ? (
                  <ul className="space-y-1">
                    {backlinks.map((bl) => (
                      <li key={bl.id}>
                        <Link
                          to="/notes/$id"
                          params={{ id: bl.id }}
                          onClick={() => ui.setMetaPanelOpen(false)}
                          className="block rounded-md border border-border px-2 py-1.5 no-underline transition-colors hover:border-accent/40"
                        >
                          <div className="line-clamp-1 text-[12px] font-medium text-text">
                            {bl.title || "Untitled"}
                          </div>
                          {bl.preview && (
                            <div className="line-clamp-1 text-[11px] text-text-muted">
                              {bl.preview}
                            </div>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-text-muted text-[12px]">
                    {backlinks ? "No notes link here yet." : "Loading…"}
                  </div>
                )}
              </Section>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
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
    <div className="flex items-baseline gap-2 text-[12px]">
      <span className="flex w-20 flex-shrink-0 items-center gap-1.5 self-start pt-px text-text-muted">
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
