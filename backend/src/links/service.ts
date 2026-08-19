import { randomInt } from "node:crypto";

import { LinkStatus } from "@prisma/client";

import { DEMO_OWNER_EMAIL, isRecord } from "./validation.js";
import type { CodeGenerator, CreateLinkInput, CreatedLink, LinkDatabase } from "./types.js";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DEFAULT_CODE_LENGTH = 7;
const MAX_GENERATED_CODE_ATTEMPTS = 5;

export class ShortCodeConflictError extends Error {
  constructor() {
    super("Short code is already taken");
  }
}

export function generateShortCode(length = DEFAULT_CODE_LENGTH): string {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
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

function isUniqueConstraintError(error: unknown): boolean {
  return isRecord(error) && error.code === "P2002";
}

