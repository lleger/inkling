export function AppShellFallback() {
  return (
    <div className="app-shell-fallback" aria-label="Loading Inkling">
      <aside className="app-shell-fallback__sidebar">
        <div className="app-shell-fallback__brand">
          <div className="app-shell-fallback__mark" />
          <div className="app-shell-fallback__line app-shell-fallback__line--brand" />
        </div>
        <div className="app-shell-fallback__button" />
        <div className="app-shell-fallback__group">
          <div className="app-shell-fallback__line" />
          <div className="app-shell-fallback__line app-shell-fallback__line--short" />
          <div className="app-shell-fallback__line app-shell-fallback__line--mid" />
        </div>
        <div className="app-shell-fallback__group app-shell-fallback__group--lower">
          <div className="app-shell-fallback__line app-shell-fallback__line--mid" />
          <div className="app-shell-fallback__line app-shell-fallback__line--short" />
        </div>
      </aside>
      <main className="app-shell-fallback__main">
        <div className="app-shell-fallback__toolbar">
          <div className="app-shell-fallback__pill" />
          <div className="app-shell-fallback__actions">
            <div className="app-shell-fallback__dot" />
            <div className="app-shell-fallback__dot" />
          </div>
        </div>
        <section className="app-shell-fallback__page">
          <div className="app-shell-fallback__title" />
          <div className="app-shell-fallback__body-line" />
          <div className="app-shell-fallback__body-line app-shell-fallback__body-line--wide" />
          <div className="app-shell-fallback__body-line app-shell-fallback__body-line--narrow" />
        </section>
      </main>
    </div>
  );
}
