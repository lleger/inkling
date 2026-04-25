import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { VersionHistoryView } from "../components/VersionHistoryView";
import { noteQuery, queryKeys } from "../lib/queries";
import { useUI } from "../context/UIContext";

export const Route = createFileRoute("/_app/notes/$id_/versions")({
  loader: ({ context: { queryClient }, params: { id } }) =>
    queryClient.ensureQueryData(noteQuery(id)),
  component: VersionsRoute,
});

function VersionsRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const ui = useUI();
  const qc = useQueryClient();
  const { data: note } = useQuery(noteQuery(id));

  if (!note) return null;

  return (
    <VersionHistoryView
      noteId={id}
      noteTitle={note.title}
      onClose={() => navigate({ to: "/notes/$id", params: { id } })}
      onRestore={(restored) => {
        qc.invalidateQueries({ queryKey: queryKeys.note(id) });
        qc.invalidateQueries({ queryKey: queryKeys.notes });
        ui.setToast({ message: "Version restored" });
        navigate({ to: "/notes/$id", params: { id: restored.id } });
      }}
    />
  );
}
