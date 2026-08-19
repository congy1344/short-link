"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { createLink, getLinkStats, listLinks, updateLink, type LinkStats, type LinkSummary } from "../api";
import { AnalyticsPanel } from "../components/AnalyticsPanel";
import { CreateLinkForm } from "../components/CreateLinkForm";
import { LinkTable, type StatusFilter } from "../components/LinkTable";
import { Metrics } from "../components/Metrics";

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
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [pendingId, setPendingId] = useState<string | null>(null);

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

  async function reloadLinks(nextSelectedId?: string) {
    const nextLinks = await listLinks();
    setLinks(nextLinks);
    setSelectedId(nextSelectedId ?? selectedId ?? nextLinks[0]?.id);
  }

  async function toggleStatus(link: LinkSummary) {
    setPendingId(link.id);

    try {
      await updateLink(link.id, { status: link.status === "ACTIVE" ? "DISABLED" : "ACTIVE" });
      await reloadLinks(link.id);
      setError(null);
    } catch (toggleError) {
      setError(errorMessage(toggleError));
    } finally {
      setPendingId(null);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    setShortUrl(null);
    setCopyLabel("Copy");

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
      setShortUrl(new URL("/" + created.shortCode, window.location.origin).toString());
    } catch (createError) {
      setFormError(errorMessage(createError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyShortUrl() {
    if (!shortUrl) return;

    if (!navigator.clipboard) {
      setCopyLabel("Select link");
      return;
    }

    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopyLabel("Copied");
    } catch {
      setCopyLabel("Select link");
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

        <Metrics totalClicks={totalClicks} activeLinks={activeLinks} topReferrer={topReferrer} />

        <section className="dashboard-grid">
          <CreateLinkForm
            isSubmitting={isSubmitting}
            formError={formError}
            notice={notice}
            shortUrl={shortUrl}
            copyLabel={copyLabel}
            onSubmit={handleCreate}
            onCopy={() => void copyShortUrl()}
          />
          <LinkTable
            links={filteredLinks}
            isLoading={isLoadingLinks}
            shownLinks={filteredLinks.length}
            selectedId={selectedId}
            search={search}
            statusFilter={statusFilter}
            pendingId={pendingId}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onSelect={setSelectedId}
            onToggle={(link) => void toggleStatus(link)}
          />
          <AnalyticsPanel selectedLink={selectedLink} stats={stats} isLoadingStats={isLoadingStats} />
        </section>
      </section>
    </main>
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

