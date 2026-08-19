import { createHmac } from "node:crypto";

import type { FastifyRequest } from "fastify";

import { cleanOptionalString } from "./validation.js";
import type { ClickStatsEvent, LinkDatabase, RedirectLink } from "./types.js";

export function buildStats(events: ClickStatsEvent[]) {
  const byDay = new Map<string, number>();
  const referrers = new Map<string, number>();
  const userAgents = new Map<string, number>();
  const devices = new Map<string, number>();
  const visitors = new Set<string>();

  for (const event of events) {
    increment(byDay, new Date(event.clickedAt).toISOString().slice(0, 10));
    increment(referrers, cleanOptionalString(event.referrerHost) ?? "direct");
    increment(userAgents, cleanOptionalString(event.browser) ?? "Unknown");
    increment(devices, cleanOptionalString(event.device) ?? "Unknown");

    if (event.ipHash) {
      visitors.add(event.ipHash);
    }
  }

  return {
    totalClicks: events.length,
    uniqueVisitors: visitors.size,
    clicksByDay: [...byDay.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([day, clicks]) => ({ day, clicks })),
    topReferrers: topEntries(referrers).map(([referrer, clicks]) => ({ referrer, clicks })),
    topUserAgents: topEntries(userAgents).map(([userAgent, clicks]) => ({ userAgent, clicks })),
    topDevices: topEntries(devices).map(([device, clicks]) => ({ device, clicks }))
  };
}

export async function recordClick(
  db: LinkDatabase,
  link: RedirectLink,
  request: FastifyRequest,
  ipHashSecret: string
): Promise<void> {
  try {
    const userAgent = headerValue(request.headers["user-agent"]) ?? null;

    await db.clickEvent.create({
      data: {
        linkId: link.id,
        referrerHost: referrerHost(request),
        userAgent,
        browser: browserFromUserAgent(userAgent),
        os: osFromUserAgent(userAgent),
        device: deviceFromUserAgent(userAgent),
        ipHash: request.ip ? hashIp(ipHashSecret, request.ip) : null
      }
    });
  } catch {
    // Analytics is best-effort: redirect availability wins over telemetry.
  }
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function topEntries(map: Map<string, number>): Array<[string, number]> {
  return [...map.entries()].sort(([a, aCount], [b, bCount]) => bCount - aCount || a.localeCompare(b)).slice(0, 5);
}

function referrerHost(request: FastifyRequest): string | null {
  const referrer = headerValue(request.headers.referer ?? request.headers.referrer);
  if (!referrer) {
    return null;
  }

  try {
    return new URL(referrer).host;
  } catch {
    return null;
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function hashIp(secret: string, ip: string): string {
  return createHmac("sha256", secret).update(ip).digest("hex");
}

function browserFromUserAgent(userAgent: string | null): string | null {
  if (!userAgent) {
    return null;
  }

  if (userAgent.includes("Edg/")) return "Edge";
  if (userAgent.includes("Firefox/")) return "Firefox";
  if (userAgent.includes("Chrome/")) return "Chrome";
  if (userAgent.includes("Safari/")) return "Safari";
  return null;
}

function osFromUserAgent(userAgent: string | null): string | null {
  if (!userAgent) {
    return null;
  }

  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS";
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("Mac OS X")) return "macOS";
  if (userAgent.includes("Linux")) return "Linux";
  return null;
}

function deviceFromUserAgent(userAgent: string | null): string | null {
  if (!userAgent) {
    return null;
  }

  return /Mobi|Android|iPhone|iPad/i.test(userAgent) ? "mobile" : "desktop";
}

