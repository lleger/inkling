import { createFileRoute } from "@tanstack/react-router";
import { DailySettings } from "../components/settings/DailySettings";
import { useSettings } from "../hooks/useSettings";

export const Route = createFileRoute("/_app/settings/daily")({
  component: DailySettingsRoute,
});

function DailySettingsRoute() {
  const { settings, update } = useSettings();
  return <DailySettings settings={settings} onUpdateSettings={update} />;
}
