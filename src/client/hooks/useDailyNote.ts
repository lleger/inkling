import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useNotes } from "./useNotes";
import { useSettings } from "./useSettings";
import { invalidateNotes } from "../lib/note-cache";
import { notesQuery } from "../lib/queries";
import {
  dailyFolder,
  dailyTitle,
  findDailyNote,
  renderDailyNoteTemplate,
} from "../lib/daily-notes";
import type { NoteMeta } from "../types";

export function todayTitle(d: Date = new Date()): string {
  return dailyTitle(d);
}

/**
 * Find or create today's daily note, then navigate to it.
 * Match logic: a note in the configured folder whose title is exactly YYYY-MM-DD.
 */
export function useDailyNote() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { notes, loading, create, move } = useNotes();
  const { settings } = useSettings();

  const openDailyNote = async (date: Date = new Date()) => {
    const title = dailyTitle(date);
    const folder = dailyFolder(settings);

    const availableNotes = loading ? await qc.ensureQueryData(notesQuery()) : notes;
    const existing = findDailyNote(availableNotes as NoteMeta[], date, folder);

    if (existing) {
      navigate({ to: "/notes/$id", params: { id: existing.id } });
      return;
    }

    const note = await create({
      title,
      content: renderDailyNoteTemplate(settings.dailyNoteTemplate, date),
    });
    if (folder) {
      await move(note.id, folder);
    }
    invalidateNotes(qc);
    navigate({ to: "/notes/$id", params: { id: note.id } });
  };

  return { openDailyNote };
}
