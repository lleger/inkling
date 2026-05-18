## PWA: Installable

- Load the production build of the app and sign in
- The page exposes a web app manifest at `/manifest.webmanifest` with:
  - `name`: "Inkling"
  - `short_name`: "Inkling"
  - `display`: "standalone"
  - `start_url`: "/" and `scope`: "/"
  - At least one 192×192 PNG icon and one 512×512 PNG icon
  - A maskable 512×512 icon
- `index.html` includes `<link rel="manifest">`, `theme-color`, and Apple touch-icon meta tags
- The browser (Chrome desktop, Chrome Android, Safari iOS) offers an "Install" / "Add to Home Screen" action
- After installing, launching the app opens it in a standalone window with no browser chrome
- The app's icon on the home screen / launcher shows the Inkling logo (not a generic globe)

## PWA: Service Worker Registration

- On the production build only, a service worker registers at scope `/`
- DevTools → Application → Service Workers shows `sw.js` as activated
- The worker precaches the app shell (JS, CSS, HTML, icons) — visible in DevTools → Application → Cache Storage
- API calls (`/api/*`) are NOT intercepted by the service worker — they always go to the network
- Auth callbacks and `/cdn-cgi/*` likewise bypass the service worker
- Dev (`pnpm run dev`) does not register a service worker — verified by checking DevTools shows no active worker

## PWA: Update Prompt

- Deploy a new build of the app while a tab is open from the previous build
- Within ~30 minutes, OR when the tab becomes visible again, a toast appears:
  "A new version of Inkling is available." with a "Refresh" action
- Clicking "Refresh" activates the new service worker and reloads the page
- After reload, the app is on the new version
- Dismissing the toast does not reload; the new version installs after the next manual reload
- The update prompt does not fire on every visibility change — only when an update was actually detected
- Auto-reload never happens: the user is always given the choice (so unsaved edits aren't lost)

## PWA: Offline Behavior (App Shell Only)

- Install the app, then go offline (DevTools → Network → Offline)
- Cold-launch the installed app — the shell loads from the service worker cache
- Note lists, note content, settings, and other API-backed data fail to load (offline editing is not supported in this milestone)
- Re-enabling the network restores normal operation
