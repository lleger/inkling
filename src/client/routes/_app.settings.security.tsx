import { createFileRoute, useSearch } from "@tanstack/react-router";
import { SecuritySettings } from "../components/settings/SecuritySettings";
import { useUser } from "../hooks/useUser";

export const Route = createFileRoute("/_app/settings/security")({
  validateSearch: (search): { emailChange?: "check-new-email" | "changed"; error?: string } => ({
    emailChange:
      search.emailChange === "check-new-email" || search.emailChange === "changed"
        ? search.emailChange
        : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: SecuritySettingsRoute,
});

function SecuritySettingsRoute() {
  const user = useUser();
  const search = useSearch({ from: "/_app/settings/security" });
  return (
    <SecuritySettings
      userEmail={user?.email ?? null}
      twoFactorEnabled={user?.twoFactorEnabled ?? false}
      emailChangeStatus={search.emailChange}
      emailChangeLinkError={search.error}
    />
  );
}
