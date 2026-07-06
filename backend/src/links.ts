import { createHmac, randomInt } from "node:crypto";

import { LinkStatus } from "@prisma/client";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DEFAULT_CODE_LENGTH = 7;
const MAX_GENERATED_CODE_ATTEMPTS = 5;
const DEMO_OWNER_EMAIL = "demo@shortlink.local";
const ALIAS_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
const LINK_CACHE_TTL_SECONDS = 600;

export type CodeGenerator = () => string;

export type CreateLinkInput = {
  destinationUrl: string;
  customAlias?: string;
  title?: string;
  ownerEmail?: string;
};

export type CreatedLink = {
  id: string;
  shortCode: string;
  destinationUrl: string;
  title: string | null;
};

type RedirectLink = {
  id: string;
  destinationUrl: string;
  status: LinkStatus;
  expiresAt: Date | string | null;
};

type OwnerLink = {
  id: string;
  shortCode: string;
  destinationUrl: string;
  title: string | null;
  status: LinkStatus;
  expiresAt: Date | string | null;
  createdAt: Date | string;
  _count: { clickEvents: number };
};

type ClickEventInput = {
  linkId: string;
  referrerHost: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  ipHash: string | null;
};

export type LinkDatabase = {
  user: {
    findUnique(args: {
      where: { email: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    upsert(args: {
      where: { email: string };
      update: { name: string };
      create: { email: string; name: string; passwordHash: string };
    }): Promise<{ id: string }>;
  };
  link: {
    create(args: {
      data: {
        ownerId: string;
        shortCode: string;
        destinationUrl: string;
        status: LinkStatus;
        title: string | null;
      };
    }): Promise<CreatedLink>;
    findUnique(args: {
      where: { shortCode: string };
      select: { id: true; destinationUrl: true; status: true; expiresAt: true };
    }): Promise<RedirectLink | null>;
    findMany(args: {
      where: { ownerId: string };
      orderBy: { createdAt: "desc" };
      select: {
        id: true;
        shortCode: true;
        destinationUrl: true;
        title: true;
        status: true;
        expiresAt: true;
        createdAt: true;
        _count: { select: { clickEvents: true } };
      };
    }): Promise<OwnerLink[]>;
  };
  clickEvent: {
    create(args: { data: ClickEventInput }): Promise<unknown>;
  };
};

export type LinkCache = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
};

type ParseResult = { ok: true; input: CreateLinkInput } | { ok: false; message: string };

export class ShortCodeConflictError extends Error {
  constructor() {
    super("Short code is already taken");
  }
}

export function generateShortCode(length = DEFAULT_CODE_LENGTH): string {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export function parseCreateLinkBody(body: unknown): ParseResult {
  if (!isRecord(body)) {
    return { ok: false, message: "Request body must be an object" };
  }

  const destinationUrl = cleanOptionalString(body.destinationUrl);
  if (!destinationUrl || !isHttpUrl(destinationUrl)) {
    return { ok: false, message: "destinationUrl must be a valid http or https URL" };
  }

  const customAlias = cleanOptionalString(body.customAlias);
  if (customAlias && !ALIAS_PATTERN.test(customAlias)) {
    return { ok: false, message: "customAlias must be 3-32 characters using letters, numbers, _ or -" };
  }

  const title = cleanOptionalString(body.title);
  const ownerEmail = cleanOptionalString(body.ownerEmail);

  return {
    ok: true,
    input: {
      destinationUrl,
      ...(customAlias ? { customAlias } : {}),
      ...(title ? { title } : {}),
      ...(ownerEmail ? { ownerEmail } : {})
    }
  };
}

export async function createShortLink(
  db: LinkDatabase,
  input: CreateLinkInput,
  codeGenerator: CodeGenerator = generateShortCode
): Promise<CreatedLink> {
  const ownerEmail = input.ownerEmail ?? DEMO_OWNER_EMAIL;
  const owner = await db.user.upsert({
    where: { email: ownerEmail },
    update: { name: "Demo User" },
    create: {
      email: ownerEmail,
      name: "Demo User",
      passwordHash: "demo-only"
    }
  });

  const attempts = input.customAlias ? 1 : MAX_GENERATED_CODE_ATTEMPTS;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const shortCode = input.customAlias ?? codeGenerator();

    try {
      return await db.link.create({
        data: {
          ownerId: owner.id,
          shortCode,
          destinationUrl: input.destinationUrl,
          status: LinkStatus.ACTIVE,
          title: input.title ?? null
        }
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  throw new ShortCodeConflictError();
}

export const linksRoutes: FastifyPluginAsync<{
  prisma: LinkDatabase;
  redis: LinkCache;
  ipHashSecret: string;
  codeGenerator?: CodeGenerator;
}> = async (app, options) => {
  app.get("/links", async () => {
    const owner = await options.prisma.user.findUnique({
      where: { email: DEMO_OWNER_EMAIL },
      select: { id: true }
    });

    if (!owner) {
      return { links: [] };
    }

    const links = await options.prisma.link.findMany({
      where: { ownerId: owner.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        shortCode: true,
        destinationUrl: true,
        title: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        _count: { select: { clickEvents: true } }
      }
    });

    return {
      links: links.map((link) => ({
        id: link.id,
        shortCode: link.shortCode,
        destinationUrl: link.destinationUrl,
        title: link.title,
        status: link.status,
        expiresAt: link.expiresAt,
        createdAt: link.createdAt,
        totalClicks: link._count.clickEvents
      }))
    };
  });

  app.post("/links", async (request, reply) => {
    const parsed = parseCreateLinkBody(request.body);
    if (!parsed.ok) {
      return reply.code(400).send({ error: parsed.message });
    }

    try {
      const link = await createShortLink(options.prisma, parsed.input, options.codeGenerator);
      return reply.code(201).send({
        id: link.id,
        shortCode: link.shortCode,
        destinationUrl: link.destinationUrl,
        title: link.title
      });
    } catch (error) {
      if (error instanceof ShortCodeConflictError) {
        return reply.code(409).send({ error: error.message });
      }

      throw error;
    }
  });

  app.get("/:code", async (request, reply) => {
    const { code } = request.params as { code: string };
    if (!ALIAS_PATTERN.test(code)) {
      return reply.code(400).send({ error: "Invalid short code" });
    }

    const link = await findRedirectLink(options.prisma, options.redis, code);
    if (!link) {
      return reply.code(404).send({ error: "Short code not found" });
    }

    if (link.status !== LinkStatus.ACTIVE || isExpired(link.expiresAt)) {
      return reply.code(410).send({ error: "Short link is inactive" });
    }

    await recordClick(options.prisma, link, request, options.ipHashSecret);

    return reply.redirect(link.destinationUrl, 302);
  });
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return isRecord(error) && error.code === "P2002";
}

async function findRedirectLink(db: LinkDatabase, redis: LinkCache, code: string): Promise<RedirectLink | null> {
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

function isExpired(expiresAt: Date | string | null): boolean {
  return expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false;
}

async function recordClick(
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
    // ponytail: direct insert for MVP, move to async queue when redirect latency matters.
  }
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

  // ponytail: naive UA labels, replace with a parser when dashboard needs accuracy.
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
