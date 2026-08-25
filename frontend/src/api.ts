export type LinkStatus = "ACTIVE" | "DISABLED";

export type LinkSummary = {
  id: string;
  shortCode: string;
  destinationUrl: string;
  title: string | null;
  status: LinkStatus;
  expiresAt: string | null;
  createdAt: string;
  totalClicks: number;
};

export type LinkStats = {
  totalClicks: number;
  uniqueVisitors: number;
  clicksByDay: Array<{ day: string; clicks: number }>;
  topReferrers: Array<{ referrer: string; clicks: number }>;
  topUserAgents: Array<{ userAgent: string; clicks: number }>;
  topDevices: Array<{ device: string; clicks: number }>;
};

export type CreateLinkInput = {
  destinationUrl: string;
  title?: string;
  customAlias?: string;
};

export type CreatedLink = {
  id: string;
  shortCode: string;
  destinationUrl: string;
  title: string | null;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(/\/$/, "");
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 15_000, 15_000];
const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 504]);

export async function listLinks(): Promise<LinkSummary[]> {
  const data = await request<{ links: LinkSummary[] }>("/links");
  return data.links;
}

export async function getLinkStats(id: string): Promise<LinkStats> {
  return request<LinkStats>(`/links/${encodeURIComponent(id)}/stats?days=30`);
}

export async function updateLink(id: string, input: { status?: LinkStatus; expiresAt?: string | null }): Promise<void> {
  await request(`/links/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export async function createLink(input: CreateLinkInput): Promise<CreatedLink> {
  return request<CreatedLink>("/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const canRetry = (init.method ?? "GET").toUpperCase() === "GET";

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(`${API_BASE_URL}${path}`, init);
    } catch (error) {
      if (!canRetry || attempt === RETRY_DELAYS_MS.length) throw error;
      await delay(RETRY_DELAYS_MS[attempt]);
      continue;
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    const shouldRetry = canRetry && RETRYABLE_STATUS_CODES.has(response.status) && attempt < RETRY_DELAYS_MS.length;
    if (shouldRetry) {
      await delay(RETRY_DELAYS_MS[attempt]);
      continue;
    }

    let message = `Request failed with status ${response.status}`;

    try {
      const data = (await response.json()) as { error?: string };
      message = data.error ?? message;
    } catch {
      // Keep the status message when the API does not return JSON.
    }

    throw new Error(message);
  }

  throw new Error("Request failed while contacting the API");
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
