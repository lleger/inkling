import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Suspense } from "react";
import type { QueryClient } from "@tanstack/react-query";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
});

function RootLayout() {
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
