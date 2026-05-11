export function AppShellFallback() {
  return (
    <div className="app-shell-fallback" aria-label="Loading Inkling">
      <aside className="app-shell-fallback__sidebar">
        <div className="app-shell-fallback__sidebar-header">
          <div className="app-shell-fallback__icon-button" aria-hidden="true">
            <span>⌂</span>
          </div>
          <div className="app-shell-fallback__button-group">
            <div className="app-shell-fallback__small-button" aria-hidden="true">
              <span>+</span>
            </div>
            <div className="app-shell-fallback__small-button" aria-hidden="true">
              <span>‹</span>
            </div>
          </div>
        </div>
        <div className="app-shell-fallback__list">
          <div className="app-shell-fallback__card">
            <div className="app-shell-fallback__label app-shell-fallback__label--tiny" />
            <div className="app-shell-fallback__row">
              <div className="app-shell-fallback__label app-shell-fallback__label--short" />
              <span className="app-shell-fallback__date">Today</span>
            </div>
            <div className="app-shell-fallback__row">
              <div className="app-shell-fallback__label app-shell-fallback__label--mid" />
              <span className="app-shell-fallback__date">Yesterday</span>
            </div>
          </div>
          <div className="app-shell-fallback__card app-shell-fallback__card--compact">
            <div className="app-shell-fallback__label app-shell-fallback__label--mid" />
            <span className="app-shell-fallback__date">⌘⇧X</span>
          </div>
          <div className="app-shell-fallback__note-line" />
          <div className="app-shell-fallback__note-line app-shell-fallback__note-line--short" />
        </div>
        <div className="app-shell-fallback__sidebar-footer">
          <div className="app-shell-fallback__footer-line" />
          <div className="app-shell-fallback__small-button" />
          <div className="app-shell-fallback__small-button" />
        </div>
      </aside>
      <main className="app-shell-fallback__main">
        <section className="app-shell-fallback__page">
          <div className="app-shell-fallback__search">Search notes...</div>
          <div className="app-shell-fallback__stats">
            <span>Loading notes</span>
            <span className="app-shell-fallback__stat-pill" />
          </div>
          <div className="app-shell-fallback__grid">
            <div className="app-shell-fallback__new-card">New Note</div>
            <div className="app-shell-fallback__note-card">
              <div className="app-shell-fallback__label app-shell-fallback__label--card" />
              <div className="app-shell-fallback__body-line" />
              <div className="app-shell-fallback__body-line app-shell-fallback__body-line--wide" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
