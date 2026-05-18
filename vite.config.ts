import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/client/routes",
      generatedRouteTree: "src/client/routeTree.gen.ts",
    }),
    tailwindcss(),
    react(),
    cloudflare(),
    VitePWA({
      // `prompt` lets us show a toast and ask the user to refresh instead of
      // auto-reloading mid-edit. The editor has unsaved-changes state we'd
      // clobber otherwise.
      registerType: "prompt",
      // Strategy "generateSW" + Workbox: Vite emits the SW with the
      // precache manifest baked in, hashed alongside the rest of the build.
      strategies: "generateSW",
      // We don't run the SW in dev — Vite HMR + a SW is a recipe for
      // mysterious cache hits. Production builds only.
      devOptions: { enabled: false },
      includeAssets: [
        "favicon.svg",
        "favicon-dark.svg",
        "apple-touch-icon.png",
        "app-icon-light.svg",
        "app-icon-dark.svg",
      ],
      manifest: {
        name: "Inkling",
        short_name: "Inkling",
        description: "A quiet place for notes.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#FAF8F5",
        theme_color: "#FAF8F5",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // SPA fallback: any navigation request that misses the precache
        // resolves to index.html so client-side routes still work offline.
        navigateFallback: "/index.html",
        // CRITICAL: never let the SW handle API requests. Auth, notes,
        // attachments, and OAuth callbacks must hit the worker. Bypassing
        // the SW also avoids accidental stale-data bugs.
        navigateFallbackDenylist: [/^\/api\//, /^\/cdn-cgi\//],
        // Don't precache source maps or the icon assets we already pull
        // in explicitly. Keeps the precache small.
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2}"],
        // R2 attachments can be arbitrarily large; we don't want them in
        // the precache and we don't runtime-cache /api/* either, so the
        // SW is strictly for app-shell assets.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // No runtimeCaching: every fetch the SW doesn't already have
        // precached falls through to the network. That keeps notes data
        // fresh and avoids touching authenticated endpoints.
        cleanupOutdatedCaches: true,
        // Don't claim clients on activation — the prompt flow controls
        // when the new SW takes over via skipWaiting + reload.
        clientsClaim: false,
        skipWaiting: false,
      },
    }),
  ],
});
