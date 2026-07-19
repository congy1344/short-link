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

export async function listLinks(): Promise<LinkSummary[]> {
  const data = await request<{ links: LinkSummary[] }>("/links");
  return data.links;
}

export async function getLinkStats(id: string): Promise<LinkStats> {
  return request<LinkStats>(`/links/${encodeURIComponent(id)}/stats?days=30`);
}

export async function createLink(input: CreateLinkInput): Promise<CreatedLink> {
  return request<CreatedLink>("/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const data = (await response.json()) as { error?: string };
      message = data.error ?? message;
    } catch {
      // Keep the status message when the API does not return JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}
