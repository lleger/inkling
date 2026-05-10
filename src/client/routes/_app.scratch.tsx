import { createFileRoute, redirect } from "@tanstack/react-router";
import * as api from "../lib/api";
import { notesQuery, queryKeys } from "../lib/queries";
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
      await api.moveNoteToFolder(note.id, scratchFolder());
      qc.invalidateQueries({ queryKey: queryKeys.notes });
      throw redirect({ to: "/notes/$id", params: { id: note.id } });
    }

    if (shouldResetScratchNote(existing.updated_at)) {
      const note = await api.fetchNote(existing.id);
      if (note.content.trim() !== renderScratchNoteTemplate().trim()) {
        await api.updateNote(existing.id, { content: renderScratchNoteTemplate() });
      }
      qc.invalidateQueries({ queryKey: queryKeys.notes });
      qc.invalidateQueries({ queryKey: queryKeys.note(existing.id) });
    }

    throw redirect({ to: "/notes/$id", params: { id: existing.id } });
  },
});
