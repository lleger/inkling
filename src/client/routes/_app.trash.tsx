import { createFileRoute } from "@tanstack/react-router";
import { TrashView } from "../components/TrashView";

export const Route = createFileRoute("/_app/trash")({
  component: TrashView,
});
