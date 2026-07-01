import { LinkStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const day = new Date("2026-07-01T00:00:00.000Z");

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@shortlink.local" },
    update: { name: "Demo User" },
    create: {
      email: "demo@shortlink.local",
      name: "Demo User",
      passwordHash: "demo-only"
    }
  });

  const docsLink = await prisma.link.upsert({
    where: { shortCode: "docs101" },
    update: {
      ownerId: user.id,
      destinationUrl: "https://example.com/docs",
      status: LinkStatus.ACTIVE,
      title: "Product docs"
    },
    create: {
      ownerId: user.id,
      shortCode: "docs101",
      destinationUrl: "https://example.com/docs",
      status: LinkStatus.ACTIVE,
      title: "Product docs"
    }
  });

  const launchLink = await prisma.link.upsert({
    where: { shortCode: "launch" },
    update: {
      ownerId: user.id,
      destinationUrl: "https://example.com/launch",
      status: LinkStatus.ACTIVE,
      title: "Launch page"
    },
    create: {
      ownerId: user.id,
      shortCode: "launch",
      destinationUrl: "https://example.com/launch",
      status: LinkStatus.ACTIVE,
      title: "Launch page"
    }
  });

  const linkIds = [docsLink.id, launchLink.id];

  await prisma.clickEvent.deleteMany({
    where: { linkId: { in: linkIds } }
  });

  await prisma.dailyLinkStat.deleteMany({
    where: { linkId: { in: linkIds } }
  });

  await prisma.clickEvent.createMany({
    data: [
      {
        linkId: docsLink.id,
        clickedAt: new Date("2026-07-01T09:00:00.000Z"),
        referrerHost: "github.com",
        browser: "Chrome",
        os: "Windows",
        device: "desktop",
        ipHash: "demo-ip-1"
      },
      {
        linkId: docsLink.id,
        clickedAt: new Date("2026-07-01T10:30:00.000Z"),
        referrerHost: "linkedin.com",
        browser: "Safari",
        os: "iOS",
        device: "mobile",
        ipHash: "demo-ip-2"
      },
      {
        linkId: launchLink.id,
        clickedAt: new Date("2026-07-01T11:15:00.000Z"),
        referrerHost: "x.com",
        browser: "Firefox",
        os: "Linux",
        device: "desktop",
        ipHash: "demo-ip-3"
      }
    ]
  });

  await prisma.dailyLinkStat.createMany({
    data: [
      {
        linkId: docsLink.id,
        day,
        clicks: 2,
        uniqueVisitors: 2
      },
      {
        linkId: launchLink.id,
        day,
        clicks: 1,
        uniqueVisitors: 1
      }
    ]
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
