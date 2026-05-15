import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useDailyNote } from "../hooks/useDailyNote";
import { useNotes } from "../hooks/useNotes";
import { useSettings } from "../hooks/useSettings";
import { PageContainer } from "../components/PageContainer";
import { PageError } from "../components/LoadStates";
import { dailyFolder, dailyLabel, isDailyNote, parseDailyTitle } from "../lib/daily-notes";
import type { NoteMeta } from "../types";

export const Route = createFileRoute("/_app/daily")({
  component: DailyRoute,
});

function DailyRoute() {
  const navigate = useNavigate();
  const { notes, error, refetch } = useNotes();
  const { settings } = useSettings();
  const { openDailyNote } = useDailyNote();
  const folder = dailyFolder(settings);

  const groups = useMemo(() => groupDailyNotes(notes, folder), [notes, folder]);
  const hasDailyNotes = groups.length > 0;

  if (error) {
    return (
      <PageError
        title="Unable to load daily notes"
        message="Daily notes could not be fetched."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <PageContainer maxWidth="max-w-[720px]">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-text">
            <CalendarDays size={22} className="text-text-muted" />
            Daily Notes
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {hasDailyNotes
              ? `${countDailyNotes(groups)} entries in ${folder}`
              : `No daily notes in ${folder} yet`}
          </p>
        </div>
        <button
          onClick={() => openDailyNote()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <CalendarDays size={15} />
          Today
        </button>
      </header>

      {hasDailyNotes ? (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                {group.label}
              </h2>
              <div className="overflow-hidden rounded-xl border border-border bg-surface-secondary">
                {group.notes.map(({ note, date }, index) => (
                  <button
                    key={note.id}
                    onClick={() => navigate({ to: "/notes/$id", params: { id: note.id } })}
                    className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover ${
                      index > 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <div className="flex min-w-24 flex-col">
                      <span className="text-sm font-medium text-text">{dailyLabel(date)}</span>
                      <span className="text-[11px] text-text-muted">{note.title}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      {note.preview ? (
                        <p className="line-clamp-1 text-sm text-text-secondary">{note.preview}</p>
                      ) : (
                        <p className="text-sm text-text-muted">No preview yet</p>
                      )}
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-text-muted">
                        <span>{note.word_count} words</span>
                        {note.task_total > 0 && (
                          <span>
                            {note.task_done}/{note.task_total} tasks
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface-secondary px-6 py-12 text-center">
          <CalendarDays size={28} className="text-text-muted" />
          <div>
            <p className="text-sm font-medium text-text">Start with today's note</p>
            <p className="mt-1 text-sm text-text-muted">
              Daily notes will appear here once they exist.
            </p>
          </div>
          <button onClick={() => openDailyNote()} className="text-sm font-medium text-accent">
            Create Today
          </button>
        </div>
      )}
    </PageContainer>
  );
}

function groupDailyNotes(notes: NoteMeta[], folder: string) {
  const dailyNotes = notes
    .map((note) => ({ note, date: parseDailyTitle(note.title) }))
    .filter(
      (entry): entry is { note: NoteMeta; date: Date } =>
        entry.date !== null && isDailyNote(entry.note, folder),
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const groups = new Map<string, { key: string; label: string; notes: typeof dailyNotes }>();
  for (const entry of dailyNotes) {
    const key = `${entry.date.getFullYear()}-${entry.date.getMonth()}`;
    const label = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
      entry.date,
    );
    if (!groups.has(key)) groups.set(key, { key, label, notes: [] });
    groups.get(key)!.notes.push(entry);
  }

  return [...groups.values()];
}

function countDailyNotes(groups: ReturnType<typeof groupDailyNotes>): number {
  return groups.reduce((sum, group) => sum + group.notes.length, 0);
}
