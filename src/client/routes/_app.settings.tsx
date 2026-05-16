import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { PageContainer } from "../components/PageContainer";
import { SettingsTabs } from "../components/settings/SettingsTabs";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  useDocumentTitle("Settings");

  return (
    <PageContainer maxWidth="max-w-[760px]">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-text">Settings</h1>
      </header>

      <SettingsTabs />
      <Outlet />
    </PageContainer>
  );
}
