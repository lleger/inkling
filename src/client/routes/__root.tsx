import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { bootstrapTheme } from "../lib/theme-bootstrap";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
});

function RootLayout() {
  // Apply theme + accent at the outermost level so the login page (which is
  // rendered outside the /_app shell) respects the user's saved preference
  // and falls back to the OS color scheme for first-time visitors. The
  // authed shell's useTheme/applyAccent take over once mounted.
  useEffect(() => {
    bootstrapTheme();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => bootstrapTheme();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-text-muted">
          Loading...
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );
}
