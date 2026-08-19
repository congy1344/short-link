import { LinkStatus } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";

import { buildStats, recordClick } from "./analytics.js";
import { findRedirectLink, isRateLimited, rateLimitExceeded } from "./cache.js";
import { createShortLink, ShortCodeConflictError } from "./service.js";
import {
  DEMO_OWNER_EMAIL,
  isExpired,
  isRecordNotFoundError,
  isValidShortCode,
  parseCreateLinkBody,
  parseDays,
  parseUpdateLinkBody
} from "./validation.js";
import type { LinksRouteOptions, UpdatedLink } from "./types.js";

const CREATE_LINK_RATE_LIMIT = 20;
const REDIRECT_RATE_LIMIT = 600;

export const linksRoutes: FastifyPluginAsync<LinksRouteOptions> = async (app, options) => {
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
    if (await isRateLimited(options.redis, "create", request.ip, CREATE_LINK_RATE_LIMIT)) {
      return rateLimitExceeded(reply);
    }

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

  app.patch("/links/:id", async (request, reply) => {
    const parsed = parseUpdateLinkBody(request.body);
    if (!parsed.ok) {
      return reply.code(400).send({ error: parsed.message });
    }

    let link: UpdatedLink;
    try {
      link = await options.prisma.link.update({
        where: { id: (request.params as { id: string }).id },
        data: parsed.data,
        select: { id: true, shortCode: true, destinationUrl: true, title: true, status: true, expiresAt: true }
      });
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return reply.code(404).send({ error: "Link not found" });
      }

      throw error;
    }

    // Drop stale redirect state immediately when status or expiry changes.
    await options.redis.del(`link:${link.shortCode}`);

    return link;
  });

  app.get("/links/:id/stats", async (request, reply) => {
    const { id } = request.params as { id: string };
    const days = parseDays((request.query as { days?: string }).days);
    if (!days) {
      return reply.code(400).send({ error: "days must be an integer from 1 to 90" });
    }

    const link = await options.prisma.link.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!link) {
      return reply.code(404).send({ error: "Link not found" });
    }

    const events = await options.prisma.clickEvent.findMany({
      where: {
        linkId: id,
        clickedAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
      },
      select: { clickedAt: true, referrerHost: true, browser: true, device: true, ipHash: true }
    });

    return buildStats(events);
  });

  app.get("/:code", async (request, reply) => {
    const { code } = request.params as { code: string };
    if (!isValidShortCode(code)) {
      return reply.code(400).send({ error: "Invalid short code" });
    }

    if (await isRateLimited(options.redis, "redirect", request.ip, REDIRECT_RATE_LIMIT)) {
      return rateLimitExceeded(reply);
    }

    const link = await findRedirectLink(options.prisma, options.redis, code);
    if (!link) {
      return reply.code(404).send({ error: "Short code not found" });
    }

    if (link.status !== LinkStatus.ACTIVE || isExpired(link.expiresAt)) {
      return reply.code(410).send({ error: "Short link is inactive" });
    }

    void recordClick(options.prisma, link, request, options.ipHashSecret);

    return reply.redirect(link.destinationUrl, 302);
  });
};

