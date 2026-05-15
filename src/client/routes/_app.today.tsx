import { createFileRoute, redirect } from "@tanstack/react-router";
import * as api from "../lib/api";
import { notesQuery, settingsQuery } from "../lib/queries";
import { invalidateNotes, upsertCachedNoteMeta, writeCachedNote } from "../lib/note-cache";
import {
  dailyFolder,
  dailyTitle,
  findDailyNote,
  renderDailyNoteTemplate,
} from "../lib/daily-notes";

export const Route = createFileRoute("/_app/today")({
  beforeLoad: async ({ context }) => {
    const qc = context.queryClient;

    // Resolve today's note id (find or create), then redirect there.
    const [notes, settings] = await Promise.all([
      qc.ensureQueryData(notesQuery()),
      qc.ensureQueryData(settingsQuery()),
    ]);

    const date = new Date();
    const title = dailyTitle(date);
    const folder = dailyFolder(settings);

    const existing = findDailyNote(notes, date, folder);
    if (existing) {
      throw redirect({ to: "/notes/$id", params: { id: existing.id } });
    }

    const note = await api.createNote({
      title,
      content: renderDailyNoteTemplate(settings.dailyNoteTemplate, date),
    });
    writeCachedNote(qc, note);
    if (folder) {
      upsertCachedNoteMeta(qc, await api.moveNoteToFolder(note.id, folder));
    }
    invalidateNotes(qc);
    throw redirect({ to: "/notes/$id", params: { id: note.id } });
  },
});
