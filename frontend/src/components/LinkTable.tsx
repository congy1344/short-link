import type { LinkStatus, LinkSummary } from "../api";
import { formatDate, formatNumber } from "./format";

export type StatusFilter = "ALL" | LinkStatus;

type LinkTableProps = {
  links: LinkSummary[];
  isLoading: boolean;
  shownLinks: number;
  selectedId?: string;
  search: string;
  statusFilter: StatusFilter;
  pendingId: string | null;
  copiedId: string | null;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onSelect: (id: string) => void;
  onCopy: (link: LinkSummary) => void;
  onToggle: (link: LinkSummary) => void;
};

export function LinkTable({
  links,
  isLoading,
  shownLinks,
  selectedId,
  search,
  statusFilter,
  pendingId,
  copiedId,
  onSearchChange,
  onStatusFilterChange,
  onSelect,
  onCopy,
  onToggle
}: LinkTableProps) {
  return (
    <section id="links-title" className="panel links-panel" aria-labelledby="links-heading">
      <div className="panel-header table-tools">
        <div>
          <p className="section-kicker">Library</p>
          <h2 id="links-heading">Links</h2>
        </div>
        <div className="controls">
          <input
            aria-label="Search links"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            type="search"
            value={search}
          />
          <select
            aria-label="Filter by status"
            onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}
            value={statusFilter}
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>
      <p className="table-summary">{isLoading ? "Syncing links" : `${formatNumber(shownLinks)} links shown`}</p>

      {isLoading ? (
        <div className="skeleton-table" aria-label="Loading links">
          <span />
          <span />
          <span />
        </div>
      ) : null}
      {!isLoading && links.length === 0 ? <p className="empty-state">No links found.</p> : null}
      {links.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Short code</th>
                <th>Destination</th>
                <th>Clicks</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr className={link.id === selectedId ? "selected-row" : undefined} key={link.id}>
                  <td data-label="Short code">
                    <button className="text-button" type="button" onClick={() => onSelect(link.id)}>
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
                  <td data-label="Actions">
                    <div className="row-actions">
                      <button className="text-button" onClick={() => onCopy(link)} type="button">
                        {copiedId === link.id ? "Copied" : "Copy link"}
                      </button>
                      <button
                        className="text-button"
                        disabled={pendingId === link.id}
                        onClick={() => onToggle(link)}
                        type="button"
                      >
                        {link.status === "ACTIVE" ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

