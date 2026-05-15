import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { VersionHistoryView } from "../components/VersionHistoryView";
import { noteQuery } from "../lib/queries";
import { invalidateNotes, writeCachedNote } from "../lib/note-cache";
import { useUI } from "../context/UIContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { PageLoading, RouteError } from "../components/LoadStates";

export const Route = createFileRoute("/_app/notes/$id_/versions")({
  loader: ({ context: { queryClient }, params: { id } }) =>
    queryClient.ensureQueryData(noteQuery(id)),
  component: VersionsRoute,
  errorComponent: RouteError,
  pendingComponent: () => <PageLoading label="Loading versions..." />,
  pendingMs: 0,
});

function VersionsRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const ui = useUI();
  const qc = useQueryClient();
  const { data: note } = useQuery(noteQuery(id));
  useDocumentTitle(note ? `Versions of ${note.title}` : "Versions");

  if (!note) return null;

  return (
    <VersionHistoryView
      noteId={id}
      noteTitle={note.title}
      onClose={() => navigate({ to: "/notes/$id", params: { id } })}
      onRestore={(restored) => {
        writeCachedNote(qc, restored);
        invalidateNotes(qc);
        ui.showToast({ message: "Version restored" });
        navigate({ to: "/notes/$id", params: { id: restored.id } });
      }}
    />
  );
}
