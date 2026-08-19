import type { LinkStatus } from "@prisma/client";

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

export type RedirectLink = {
  id: string;
  destinationUrl: string;
  status: LinkStatus;
  expiresAt: Date | string | null;
};

export type UpdatedLink = {
  id: string;
  shortCode: string;
  destinationUrl: string;
  title: string | null;
  status: LinkStatus;
  expiresAt: Date | string | null;
};

export type UpdateLinkData = {
  status?: LinkStatus;
  expiresAt?: Date | null;
};

export type OwnerLink = {
  id: string;
  shortCode: string;
  destinationUrl: string;
  title: string | null;
  status: LinkStatus;
  expiresAt: Date | string | null;
  createdAt: Date | string;
  _count: { clickEvents: number };
};

export type ClickEventInput = {
  linkId: string;
  referrerHost: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  ipHash: string | null;
};

export type ClickStatsEvent = {
  clickedAt: Date | string;
  referrerHost: string | null;
  browser: string | null;
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
    findUnique(args: {
      where: { id: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    update(args: {
      where: { id: string };
      data: UpdateLinkData;
      select: {
        id: true;
        shortCode: true;
        destinationUrl: true;
        title: true;
        status: true;
        expiresAt: true;
      };
    }): Promise<UpdatedLink>;
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
    findMany(args: {
      where: { linkId: string; clickedAt: { gte: Date } };
      select: { clickedAt: true; referrerHost: true; browser: true; device: true; ipHash: true };
    }): Promise<ClickStatsEvent[]>;
  };
};

export type LinkCache = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
  ping(): Promise<unknown>;
};

export type LinksRouteOptions = {
  prisma: LinkDatabase;
  redis: LinkCache;
  ipHashSecret: string;
  codeGenerator?: CodeGenerator;
};

