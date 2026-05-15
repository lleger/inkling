import { createFileRoute } from "@tanstack/react-router";
import { SettingsContent } from "../components/SettingsContent";
import { useSettings } from "../hooks/useSettings";
import { useUser } from "../hooks/useUser";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const { settings, update } = useSettings();
  const user = useUser();
  useDocumentTitle("Settings");

  return (
    <div className="min-h-full w-full max-w-[760px] px-4 pt-16 pb-24 animate-[fade-in_0.2s_ease-out] sm:px-6 sm:pt-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-text">Settings</h1>
      </header>

      <SettingsContent
        settings={settings}
        onUpdateSettings={update}
        userEmail={user?.email ?? null}
      />
    </div>
  );
}
