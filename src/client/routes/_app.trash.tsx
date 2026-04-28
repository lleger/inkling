import { createFileRoute } from "@tanstack/react-router";
import { TrashView } from "../components/TrashView";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export const Route = createFileRoute("/_app/trash")({
  component: TrashRoute,
});

function TrashRoute() {
  useDocumentTitle("Trash");
  return <TrashView />;
}
