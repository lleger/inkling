import { createFileRoute, redirect } from "@tanstack/react-router";
import * as api from "../lib/api";
import { notesQuery, settingsQuery, queryKeys } from "../lib/queries";
import { todayTitle } from "../hooks/useDailyNote";

export const Route = createFileRoute("/_app/today")({
  beforeLoad: async ({ context }) => {
    const qc = context.queryClient;

    // Resolve today's note id (find or create), then redirect there.
    const [notes, settings] = await Promise.all([
      qc.ensureQueryData(notesQuery()),
      qc.ensureQueryData(settingsQuery()),
    ]);

    const title = todayTitle();
    const folder = (settings as any)?.dailyNoteFolder || "Daily";

    const existing = notes.find((n) => n.title === title && n.folder === folder);
    if (existing) {
      throw redirect({ to: "/notes/$id", params: { id: existing.id } });
    }

    const note = await api.createNote({ title, content: `# ${title}\n\n` });
    if (folder) {
      await api.moveNoteToFolder(note.id, folder);
    }
    qc.invalidateQueries({ queryKey: queryKeys.notes });
    throw redirect({ to: "/notes/$id", params: { id: note.id } });
  },
});
