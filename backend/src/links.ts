import { randomInt } from "node:crypto";

import { LinkStatus } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DEFAULT_CODE_LENGTH = 7;
const MAX_GENERATED_CODE_ATTEMPTS = 5;
const DEMO_OWNER_EMAIL = "demo@shortlink.local";
const ALIAS_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

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

export type LinkDatabase = {
  user: {
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
  };
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
  codeGenerator?: CodeGenerator;
}> = async (app, options) => {
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
