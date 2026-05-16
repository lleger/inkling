import { createFileRoute } from "@tanstack/react-router";
import { SettingsContent } from "../components/SettingsContent";
import { useSettings } from "../hooks/useSettings";
import { useUser } from "../hooks/useUser";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { PageContainer } from "../components/PageContainer";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const { settings, update } = useSettings();
  const user = useUser();
  useDocumentTitle("Settings");

  return (
    <PageContainer maxWidth="max-w-[760px]">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-text">Settings</h1>
      </header>

      <SettingsContent
        settings={settings}
        onUpdateSettings={update}
        userEmail={user?.email ?? null}
        twoFactorEnabled={user?.twoFactorEnabled ?? false}
      />
    </PageContainer>
  );
}
