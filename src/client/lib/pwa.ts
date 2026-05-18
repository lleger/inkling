// Service-worker registration + "new version available" prompt.
//
// We register in `prompt` mode (configured in vite.config.ts), which means
// vite-plugin-pwa wires up the SW but does NOT activate a waiting update
// until we call `updateSW(true)`. That's deliberate: the editor has
// unsaved-changes state we don't want to clobber by auto-reloading.
//
// Flow:
//   1. App boots → registerPWA() registers the SW and sets a poll timer.
//   2. New SW detected → onNeedRefresh fires → we emit a toast.
//   3. User taps "Refresh" → updateSW(true) → SW activates → window reloads.
//
// The toast is emitted via the existing `emitToast` event so this module
// stays framework-agnostic and can be safely imported before React mounts.

import { emitToast } from "../context/UIContext";

// 30 minutes. The SW also checks on visibility-change (see below), so this
// is mostly a safety net for tabs left open all day.
const UPDATE_POLL_MS = 30 * 60 * 1000;

let updatePromptShown = false;

export async function registerPWA() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  // Avoid registering in dev: vite-plugin-pwa is configured with
  // devOptions.enabled=false, but importing the virtual module in dev
  // would still drag in workbox-window. Skip the whole thing.
  if (import.meta.env.DEV) return;

  // Dynamic import so the SW glue only ships in production builds and
  // doesn't block initial paint.
  const { registerSW } = await import("virtual:pwa-register");

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Poll for updates while the tab is open. Cloudflare serves the SW
      // file itself with short cache TTL, so this catches deploys.
      setInterval(() => {
        registration.update().catch(() => {
          // Network blip — try again on the next interval.
        });
      }, UPDATE_POLL_MS);

      // Also check whenever the user returns to the tab. This is the
      // common "I left it open on my laptop overnight" case.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          registration.update().catch(() => {});
        }
      });
    },
    onNeedRefresh() {
      // Show once per session — the SW only goes from "installed" to
      // "waiting" once per update, but defending against any double-fire.
      if (updatePromptShown) return;
      updatePromptShown = true;
      emitToast({
        message: "A new version of Inkling is available.",
        // Long timeout so the user has time to notice. Toast can still be
        // dismissed manually.
        duration: 30_000,
        action: {
          label: "Refresh",
          onClick: () => {
            // `true` = activate the waiting SW immediately. The plugin's
            // default reload-on-controllerchange handler reloads the page
            // once activation completes.
            void updateSW(true);
          },
        },
      });
    },
    onOfflineReady() {
      // App shell is now cached and the app will launch offline.
      // Intentionally quiet — the only behaviour change is faster cold
      // starts, and we don't (yet) support offline editing.
    },
  });
}
