"use client";

import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";

import { createLink, getLinkStats, listLinks, type LinkStats, type LinkStatus, type LinkSummary } from "../api";

type StatusFilter = "ALL" | LinkStatus;
type BreakdownItem = { label: string; clicks: number };

export default function Page() {
  const [links, setLinks] = useState<LinkSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [stats, setStats] = useState<LinkStats | null>(null);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoadingLinks(true);

      try {
        const nextLinks = await listLinks();
        if (ignore) return;
        setLinks(nextLinks);
        setSelectedId((current) => current ?? nextLinks[0]?.id);
        setError(null);
      } catch (loadError) {
        if (!ignore) setError(errorMessage(loadError));
      } finally {
        if (!ignore) setIsLoadingLinks(false);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (links.length === 0) {
      setSelectedId(undefined);
      return;
    }

    if (!selectedId || !links.some((link) => link.id === selectedId)) {
      setSelectedId(links[0].id);
    }
  }, [links, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setStats(null);
      return;
    }

    let ignore = false;
    const linkId = selectedId;

    async function loadStats() {
      setIsLoadingStats(true);

      try {
        const nextStats = await getLinkStats(linkId);
        if (!ignore) {
          setStats(nextStats);
          setError(null);
        }
      } catch (loadError) {
        if (!ignore) {
          setStats(null);
          setError(errorMessage(loadError));
        }
      } finally {
        if (!ignore) setIsLoadingStats(false);
      }
    }

    void loadStats();

    return () => {
      ignore = true;
    };
  }, [selectedId]);

  const filteredLinks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return links.filter((link) => {
      const matchesStatus = statusFilter === "ALL" || link.status === statusFilter;
      const matchesQuery =
        query.length === 0 ||
        [link.shortCode, link.destinationUrl, link.title ?? ""].some((value) => value.toLowerCase().includes(query));

      return matchesStatus && matchesQuery;
    });
  }, [links, search, statusFilter]);

  const selectedLink = links.find((link) => link.id === selectedId);
  const totalClicks = links.reduce((sum, link) => sum + link.totalClicks, 0);
  const activeLinks = links.filter((link) => link.status === "ACTIVE").length;
  const topReferrer = stats?.topReferrers[0]?.referrer ?? "-";
  const shownLinks = filteredLinks.length;

  async function reloadLinks(nextSelectedId?: string) {
    const nextLinks = await listLinks();
    setLinks(nextLinks);
    setSelectedId(nextSelectedId ?? selectedId ?? nextLinks[0]?.id);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const destinationUrl = fieldValue(formData, "destinationUrl");
    const title = fieldValue(formData, "title");
    const customAlias = fieldValue(formData, "customAlias");

    if (!isHttpUrl(destinationUrl)) {
      setFormError("Enter an http or https URL.");
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await createLink({
        destinationUrl,
        ...(title ? { title } : {}),
        ...(customAlias ? { customAlias } : {})
      });

      await reloadLinks(created.id);
      form.reset();
      setNotice(`Created ${created.shortCode}`);
    } catch (createError) {
      setFormError(errorMessage(createError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="top-nav">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>Shortlink</span>
        </a>
        <nav>
          <a className="nav-active" href="#links-title">
            Links
          </a>
          <a href="#detail-title">Analytics</a>
          <a href="#create-title">Create</a>
        </nav>
      </header>

      <section className="content">
        <header className="hero">
          <div>
            <p className="eyebrow">Demo workspace</p>
            <h1>Shortlink console</h1>
          </div>
          <button className="primary-action" form="create-link-form" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating" : "Create link"}
          </button>
        </header>

        {error ? (
          <div className="banner" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void reloadLinks().catch((retryError) => setError(errorMessage(retryError)))}>
              Retry
            </button>
          </div>
        ) : null}

        <section className="metrics" aria-label="Key metrics">
          <Metric label="Total clicks" value={formatNumber(totalClicks)} />
          <Metric label="Active links" value={formatNumber(activeLinks)} />
          <Metric label="Top referrer" value={topReferrer} />
        </section>

        <section className="dashboard-grid">
          <section className="panel create-panel" aria-labelledby="create-title">
            <div className="panel-header">
              <div>
                <p className="section-kicker">New short link</p>
                <h2 id="create-title">Create link</h2>
              </div>
            </div>
            <form className="create-form" id="create-link-form" onSubmit={handleCreate}>
              <label>
                Destination URL
                <input name="destinationUrl" placeholder="https://example.com/docs" required type="url" />
              </label>
              <label>
                Title
                <input name="title" placeholder="Product docs" />
              </label>
              <label>
                Custom alias
                <input name="customAlias" maxLength={32} minLength={3} pattern="[A-Za-z0-9_-]{3,32}" placeholder="docs101" />
              </label>
              {formError ? (
                <p className="form-message error" role="alert">
                  {formError}
                </p>
              ) : null}
              {notice ? <p className="form-message">{notice}</p> : null}
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating" : "Create"}
              </button>
            </form>
          </section>

          <section className="panel links-panel" aria-labelledby="links-title">
            <div className="panel-header table-tools">
              <div>
                <p className="section-kicker">Library</p>
                <h2 id="links-title">Links</h2>
              </div>
              <div className="controls">
                <input
                  aria-label="Search links"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search"
                  type="search"
                  value={search}
                />
                <select
                  aria-label="Filter by status"
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  value={statusFilter}
                >
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>
            </div>
            <p className="table-summary">{isLoadingLinks ? "Syncing links" : `${formatNumber(shownLinks)} links shown`}</p>

            {isLoadingLinks ? (
              <div className="skeleton-table" aria-label="Loading links">
                <span />
                <span />
                <span />
              </div>
            ) : null}
            {!isLoadingLinks && filteredLinks.length === 0 ? <p className="empty-state">No links found.</p> : null}
            {filteredLinks.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Short code</th>
                      <th>Destination</th>
                      <th>Clicks</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLinks.map((link) => (
                      <tr className={link.id === selectedId ? "selected-row" : undefined} key={link.id}>
                        <td data-label="Short code">
                          <button className="text-button" type="button" onClick={() => setSelectedId(link.id)}>
                            {link.shortCode}
                          </button>
                        </td>
                        <td data-label="Destination">
                          <a className="destination" href={link.destinationUrl} rel="noreferrer" target="_blank">
                            {link.title || link.destinationUrl}
                          </a>
                        </td>
                        <td data-label="Clicks">{formatNumber(link.totalClicks)}</td>
                        <td data-label="Status">
                          <span className={`status-badge status-${link.status.toLowerCase()}`}>{link.status.toLowerCase()}</span>
                        </td>
                        <td data-label="Created">{formatDate(link.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section className="panel detail-panel" aria-labelledby="detail-title">
            <div className="panel-header">
              <div>
                <p className="section-kicker">Last 30 days</p>
                <h2 id="detail-title">{selectedLink?.title || selectedLink?.shortCode || "Link detail"}</h2>
                {selectedLink ? <p className="muted destination-line">{selectedLink.destinationUrl}</p> : null}
              </div>
              {selectedLink ? <span className={`status-badge status-${selectedLink.status.toLowerCase()}`}>{selectedLink.status.toLowerCase()}</span> : null}
            </div>

            {!selectedLink ? <p className="empty-state">Create or select a link.</p> : null}
            {selectedLink && isLoadingStats ? <div className="skeleton-chart" aria-label="Loading analytics" /> : null}
            {selectedLink && stats ? (
              <>
                <div className="stat-strip" aria-label="Selected link metrics">
                  <span>
                    <strong>{formatNumber(stats.totalClicks)}</strong>
                    Total clicks
                  </span>
                  <span>
                    <strong>{formatNumber(stats.uniqueVisitors)}</strong>
                    Unique visitors
                  </span>
                  <span>
                    <strong>{stats.clicksByDay.at(-1)?.clicks ?? 0}</strong>
                    Latest day
                  </span>
                </div>
                <LineChart data={stats.clicksByDay} />
                <div className="breakdown-grid">
                  <Breakdown title="Referrers" items={stats.topReferrers.map((item) => ({ label: item.referrer, clicks: item.clicks }))} />
                  <Breakdown title="Browsers" items={stats.topUserAgents.map((item) => ({ label: item.userAgent, clicks: item.clicks }))} />
                  <Breakdown title="Devices" items={stats.topDevices.map((item) => ({ label: item.device, clicks: item.clicks }))} />
                </div>
              </>
            ) : null}
          </section>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function LineChart({ data }: { data: Array<{ day: string; clicks: number }> }) {
  if (data.length === 0) {
    return <p className="empty-state">No clicks in the selected period.</p>;
  }

  const width = 640;
  const height = 180;
  const maxClicks = Math.max(1, ...data.map((item) => item.clicks));
  const points = data
    .map((item, index) => {
      const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
      const y = height - (item.clicks / maxClicks) * (height - 20) - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <figure className="chart">
      <svg aria-label="Clicks over time" role="img" viewBox={`0 0 ${width} ${height}`}>
        <polyline fill="none" points={points} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {data.map((item, index) => {
          const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
          const y = height - (item.clicks / maxClicks) * (height - 20) - 10;
          return <circle cx={x} cy={y} key={item.day} r="4" />;
        })}
      </svg>
      <figcaption>
        {data[0]?.day} to {data.at(-1)?.day}
      </figcaption>
    </figure>
  );
}

function Breakdown({ title, items }: { title: string; items: BreakdownItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.clicks));

  return (
    <section className="breakdown" aria-label={title}>
      <h3>{title}</h3>
      {items.length === 0 ? <p className="empty-state">No data.</p> : null}
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <div className="bar-label">
            <span>{item.label}</span>
            <strong>{formatNumber(item.clicks)}</strong>
          </div>
          <div className="bar-track" aria-hidden="true">
            <span style={{ "--bar-width": `${Math.max(6, (item.clicks / max) * 100)}%` } as CSSProperties} />
          </div>
        </div>
      ))}
    </section>
  );
}

function fieldValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}
