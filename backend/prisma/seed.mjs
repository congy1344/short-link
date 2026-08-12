import { LinkStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ponytail: seed relative to today so demo data never falls out of the dashboard's 30-day window.
const day = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
day.setUTCHours(0, 0, 0, 0);

function at(hours, minutes) {
  return new Date(day.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000);
}

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

  await prisma.clickEvent.createMany({
    data: [
      {
        linkId: docsLink.id,
        clickedAt: at(9, 0),
        referrerHost: "github.com",
        browser: "Chrome",
        os: "Windows",
        device: "desktop",
        ipHash: "demo-ip-1"
      },
      {
        linkId: docsLink.id,
        clickedAt: at(10, 30),
        referrerHost: "linkedin.com",
        browser: "Safari",
        os: "iOS",
        device: "mobile",
        ipHash: "demo-ip-2"
      },
      {
        linkId: launchLink.id,
        clickedAt: at(11, 15),
        referrerHost: "x.com",
        browser: "Firefox",
        os: "Linux",
        device: "desktop",
        ipHash: "demo-ip-3"
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
