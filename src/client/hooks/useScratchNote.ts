import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useNotes } from "./useNotes";
import * as api from "../lib/api";
import { queryKeys } from "../lib/queries";
import {
  findScratchNote,
  renderScratchNoteTemplate,
  scratchFolder,
  scratchTitle,
  shouldResetScratchNote,
} from "../lib/scratch-notes";
import type { NoteMeta } from "../types";

/** Find or create the single scratch note, reset it once per local day, then navigate to it. */
export function useScratchNote() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { notes, create, move } = useNotes();

  const openScratchNote = async () => {
    const existing = findScratchNote(notes as NoteMeta[]);
    let id: string;

    if (!existing) {
      const note = await create({
        title: scratchTitle(),
        content: renderScratchNoteTemplate(),
      });
      await move(note.id, scratchFolder());
      id = note.id;
    } else {
      id = existing.id;
      if (shouldResetScratchNote(existing.updated_at)) {
        const note = await api.fetchNote(id);
        if (note.content.trim() !== renderScratchNoteTemplate().trim()) {
          await api.updateNote(id, { content: renderScratchNoteTemplate() });
        }
      }
    }

    qc.invalidateQueries({ queryKey: queryKeys.notes });
    qc.invalidateQueries({ queryKey: queryKeys.note(id) });
    navigate({ to: "/notes/$id", params: { id } });
  };

  return { openScratchNote };
}
