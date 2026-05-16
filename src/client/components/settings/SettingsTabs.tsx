import { Link } from "@tanstack/react-router";

const tabs = [
  { to: "/settings/workspace", label: "Workspace" },
  { to: "/settings/daily", label: "Daily Notes" },
  { to: "/settings/security", label: "Security" },
] as const;

export function SettingsTabs() {
  return (
    <nav
      aria-label="Settings sections"
      className="mb-6 grid w-full min-w-0 shrink-0 grid-cols-3 gap-1 overflow-hidden rounded-xl border border-border bg-surface-secondary/70 p-1"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className="min-h-9 min-w-0 truncate rounded-lg px-2 py-2 text-center text-[12px] font-medium whitespace-nowrap text-text-muted hover:bg-surface-hover hover:text-text-secondary sm:px-3 [&.active]:bg-surface [&.active]:text-text [&.active]:shadow-sm"
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
