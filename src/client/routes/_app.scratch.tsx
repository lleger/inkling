import { createFileRoute, redirect } from "@tanstack/react-router";
import * as api from "../lib/api";
import { notesQuery } from "../lib/queries";
import {
  invalidateNote,
  invalidateNotes,
  upsertCachedNoteMeta,
  writeCachedNote,
} from "../lib/note-cache";
import {
  findScratchNote,
  renderScratchNoteTemplate,
  scratchFolder,
  scratchTitle,
  shouldResetScratchNote,
} from "../lib/scratch-notes";

export const Route = createFileRoute("/_app/scratch")({
  beforeLoad: async ({ context }) => {
    const qc = context.queryClient;
    const notes = await qc.ensureQueryData(notesQuery());
    const existing = findScratchNote(notes);

    if (!existing) {
      const note = await api.createNote({
        title: scratchTitle(),
        content: renderScratchNoteTemplate(),
      });
      writeCachedNote(qc, note);
      upsertCachedNoteMeta(qc, await api.moveNoteToFolder(note.id, scratchFolder()));
      invalidateNotes(qc);
      throw redirect({ to: "/notes/$id", params: { id: note.id } });
    }

    if (shouldResetScratchNote(existing.updated_at)) {
      const note = await api.fetchNote(existing.id);
      if (note.content.trim() !== renderScratchNoteTemplate().trim()) {
        writeCachedNote(
          qc,
          await api.updateNote(existing.id, { content: renderScratchNoteTemplate() }),
        );
      }
      invalidateNotes(qc);
      invalidateNote(qc, existing.id);
    }

    throw redirect({ to: "/notes/$id", params: { id: existing.id } });
  },
});
