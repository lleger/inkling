import { useState, useEffect, useCallback } from "react";
import type { NoteMeta } from "../types";
import * as api from "../lib/api";

export function useNotes() {
  const [notes, setNotes] = useState<NoteMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.fetchNotes();
      setNotes(data);
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (options?: { title?: string; content?: string }) => {
    const note = await api.createNote(options);
    await refresh();
    return note;
  }, [refresh]);

  const remove = useCallback(
    async (id: string) => {
      await api.deleteNote(id);
      await refresh();
    },
    [refresh],
  );

  const pin = useCallback(
    async (id: string, pinned: boolean) => {
      await api.pinNote(id, pinned);
      await refresh();
    },
    [refresh],
  );

  const move = useCallback(
    async (id: string, folder: string | null) => {
      await api.moveNoteToFolder(id, folder);
      await refresh();
    },
    [refresh],
  );

  return { notes, loading, refresh, create, remove, pin, move };
}
