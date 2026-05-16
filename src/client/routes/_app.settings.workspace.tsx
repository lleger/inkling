import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSettings } from "../components/settings/WorkspaceSettings";
import { useSettings } from "../hooks/useSettings";

export const Route = createFileRoute("/_app/settings/workspace")({
  component: WorkspaceSettingsRoute,
});

function WorkspaceSettingsRoute() {
  const { settings, update } = useSettings();
  return <WorkspaceSettings settings={settings} onUpdateSettings={update} />;
}
