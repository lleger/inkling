import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { HomePage } from "../components/HomePage";
import { useNotes } from "../hooks/useNotes";
import { useUI } from "../context/UIContext";

export const Route = createFileRoute("/_app/")({
  component: HomeRoute,
});

function HomeRoute() {
  const navigate = useNavigate();
  const ui = useUI();
  const { notes, create, remove, restore } = useNotes();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      try { for (const t of JSON.parse(n.tags) as string[]) set.add(t); } catch {}
    }
    return [...set].sort();
  }, [notes]);

  const handleCreate = async () => {
    const note = await create();
    navigate({ to: "/notes/$id", params: { id: note.id } });
  };

  const handleDelete = async (id: string) => {
    const title = notes.find((n) => n.id === id)?.title || "Note";
    await remove(id);
    ui.setToast({
      message: `"${title}" moved to Trash`,
      action: {
        label: "Undo",
        onClick: async () => {
          await restore(id);
          navigate({ to: "/notes/$id", params: { id } });
        },
      },
    });
  };

  const handleImport = async (files: FileList | File[]) => {
    let last = null;
    for (const file of Array.from(files)) {
      if (!file.name.match(/\.(md|markdown|txt)$/)) continue;
      const content = await file.text();
      const title = file.name.replace(/\.(md|markdown|txt)$/, "");
      last = await create({ title, content });
    }
    if (last) navigate({ to: "/notes/$id", params: { id: last.id } });
  };

  return (
    <HomePage
      notes={notes}
      onSelectNote={(id) => navigate({ to: "/notes/$id", params: { id } })}
      onCreateNote={handleCreate}
      onDeleteNote={handleDelete}
      onImportFiles={handleImport}
      allTags={allTags}
      selectedTag={selectedTag}
      onSelectTag={setSelectedTag}
    />
  );
}
