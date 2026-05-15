import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { HomePage } from "../components/HomePage";
import { useNotes } from "../hooks/useNotes";
import { useUI } from "../context/UIContext";
import { PageError } from "../components/LoadStates";

export const Route = createFileRoute("/_app/")({
  component: HomeRoute,
});

function HomeRoute() {
  const navigate = useNavigate();
  const ui = useUI();
  const { notes, create, remove, restore, error, refetch } = useNotes();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      try {
        for (const t of JSON.parse(n.tags) as string[]) set.add(t);
      } catch {}
    }
    return [...set].sort();
  }, [notes]);

  if (error) {
    return (
      <PageError
        title="Unable to load notes"
        message="Your notes could not be fetched."
        onRetry={() => void refetch()}
      />
    );
  }

  const handleCreate = async () => {
    const note = await create();
    navigate({ to: "/notes/$id", params: { id: note.id } });
  };

  const handleDelete = async (id: string) => {
    const title = notes.find((n) => n.id === id)?.title || "Note";
    await remove(id);
    ui.showToast({
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
    let imported = 0;
    for (const file of Array.from(files)) {
      if (!file.name.match(/\.(md|markdown|txt)$/)) continue;
      const content = await file.text();
      const title = file.name.replace(/\.(md|markdown|txt)$/, "");
      last = await create({ title, content });
      imported++;
    }
    if (last) {
      navigate({ to: "/notes/$id", params: { id: last.id } });
      ui.showToast({
        message: `Imported ${imported} ${imported === 1 ? "note" : "notes"}`,
      });
    } else {
      ui.showToast({ message: "No supported files selected" });
    }
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
