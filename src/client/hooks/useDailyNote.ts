import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useNotes } from "./useNotes";
import { useSettings } from "./useSettings";
import * as api from "../lib/api";
import { queryKeys } from "../lib/queries";
import type { NoteMeta } from "../types";

export function todayTitle(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Find or create today's daily note, then navigate to it.
 * Match logic: a note in the configured folder whose title is exactly YYYY-MM-DD.
 */
export function useDailyNote() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { notes, create, move } = useNotes();
  const { settings } = useSettings();

  const openDailyNote = async () => {
    const title = todayTitle();
    const folder = settings.dailyNoteFolder || "Daily";

    const existing = notes.find(
      (n: NoteMeta) => n.title === title && n.folder === folder,
    );

    if (existing) {
      navigate({ to: "/notes/$id", params: { id: existing.id } });
      return;
    }

    const note = await create({ title, content: `# ${title}\n\n` });
    if (folder) {
      await move(note.id, folder);
    }
    qc.invalidateQueries({ queryKey: queryKeys.notes });
    navigate({ to: "/notes/$id", params: { id: note.id } });
  };

  return { openDailyNote };
}
