export function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <strong>Shortlink</strong>
        <nav>
          <a href="/">Links</a>
          <a href="/">Analytics</a>
          <a href="/">Settings</a>
        </nav>
      </aside>
      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>Link analytics</h1>
          </div>
          <button type="button">Create link</button>
        </header>
        <section className="metrics" aria-label="Key metrics">
          <article>
            <span>Total clicks</span>
            <strong>0</strong>
          </article>
          <article>
            <span>Active links</span>
            <strong>0</strong>
          </article>
          <article>
            <span>Top referrer</span>
            <strong>-</strong>
          </article>
        </section>
      </section>
    </main>
  );
}
