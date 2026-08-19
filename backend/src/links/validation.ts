import { LinkStatus } from "@prisma/client";

import type { CreateLinkInput, UpdateLinkData } from "./types.js";

export const DEMO_OWNER_EMAIL = "demo@shortlink.local";
export const ALIAS_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

export type ParseResult = { ok: true; input: CreateLinkInput } | { ok: false; message: string };
export type UpdateParseResult = { ok: true; data: UpdateLinkData } | { ok: false; message: string };

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

export function parseUpdateLinkBody(body: unknown): UpdateParseResult {
  if (!isRecord(body)) {
    return { ok: false, message: "Request body must be an object" };
  }

  const data: UpdateLinkData = {};

  if (body.status !== undefined) {
    if (body.status !== LinkStatus.ACTIVE && body.status !== LinkStatus.DISABLED) {
      return { ok: false, message: "status must be ACTIVE or DISABLED" };
    }

    data.status = body.status;
  }

  if (body.expiresAt !== undefined) {
    if (body.expiresAt === null) {
      data.expiresAt = null;
    } else {
      const expiresAt = typeof body.expiresAt === "string" ? new Date(body.expiresAt) : new Date(Number.NaN);
      if (Number.isNaN(expiresAt.getTime())) {
        return { ok: false, message: "expiresAt must be an ISO date string or null" };
      }

      data.expiresAt = expiresAt;
    }
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, message: "Provide status or expiresAt" };
  }

  return { ok: true, data };
}

export function cleanOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidShortCode(value: string): boolean {
  return ALIAS_PATTERN.test(value);
}

export function isExpired(expiresAt: Date | string | null): boolean {
  return expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false;
}

export function parseDays(value: string | undefined): number | null {
  if (value === undefined) {
    return 30;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const days = Number(value);
  return days >= 1 && days <= 90 ? days : null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isRecordNotFoundError(error: unknown): boolean {
  return isRecord(error) && error.code === "P2025";
}

