import { LinkStatus } from "@prisma/client";
import type { FastifyReply } from "fastify";

import { isExpired } from "./validation.js";
import type { LinkCache, LinkDatabase, RedirectLink } from "./types.js";

const LINK_CACHE_TTL_SECONDS = 600;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
return count
`;

export async function isRateLimited(redis: LinkCache, scope: string, ip: string, limit: number): Promise<boolean> {
  const windowId = Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1000));
  const count = await redis.eval(RATE_LIMIT_SCRIPT, {
    keys: [`rl:${scope}:${ip}:${windowId}`],
    arguments: [String(RATE_LIMIT_WINDOW_SECONDS)]
  });

  return Number(count) > limit;
}

export function rateLimitExceeded(reply: FastifyReply) {
  return reply.header("Retry-After", String(RATE_LIMIT_WINDOW_SECONDS)).code(429).send({ error: "Rate limit exceeded" });
}

export async function findRedirectLink(db: LinkDatabase, redis: LinkCache, code: string): Promise<RedirectLink | null> {
  const key = `link:${code}`;
  const cached = await readCachedLink(redis, key);
  if (cached) {
    return cached;
  }

  const link = await db.link.findUnique({
    where: { shortCode: code },
    select: { id: true, destinationUrl: true, status: true, expiresAt: true }
  });

  if (link && link.status === LinkStatus.ACTIVE && !isExpired(link.expiresAt)) {
    await redis.set(key, JSON.stringify(link), { EX: LINK_CACHE_TTL_SECONDS });
  }

  return link;
}

async function readCachedLink(redis: LinkCache, key: string): Promise<RedirectLink | null> {
  const cached = await redis.get(key);
  if (!cached) {
    return null;
  }

  try {
    return JSON.parse(cached) as RedirectLink;
  } catch {
    return null;
  }
}

