import { prisma } from "./db/client.js";

type DailyRollupRow = {
  linkId: string;
  day: Date | string;
  clicks: bigint | number;
  uniqueVisitors: bigint | number;
};

export type StatsRollupDatabase = {
  $queryRaw<T>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  dailyLinkStat: {
    upsert(args: {
      where: { linkId_day: { linkId: string; day: Date } };
      update: { clicks: number; uniqueVisitors: number };
      create: { linkId: string; day: Date; clicks: number; uniqueVisitors: number };
    }): Promise<unknown>;
  };
};

export async function rollupDailyStats(db: StatsRollupDatabase): Promise<number> {
  const rows = await db.$queryRaw<DailyRollupRow[]>`
    SELECT
      "linkId",
      DATE("clickedAt") AS day,
      COUNT(*)::int AS clicks,
      COUNT(DISTINCT "ipHash")::int AS "uniqueVisitors"
    FROM "ClickEvent"
    GROUP BY "linkId", DATE("clickedAt")
  `;

  for (const row of rows) {
    const day = toUtcDate(row.day);
    const clicks = Number(row.clicks);
    const uniqueVisitors = Number(row.uniqueVisitors);

    await db.dailyLinkStat.upsert({
      where: { linkId_day: { linkId: row.linkId, day } },
      update: { clicks, uniqueVisitors },
      create: { linkId: row.linkId, day, clicks, uniqueVisitors }
    });
  }

  return rows.length;
}

function toUtcDate(day: Date | string): Date {
  const date = day instanceof Date ? day.toISOString().slice(0, 10) : day.slice(0, 10);
  return new Date(`${date}T00:00:00.000Z`);
}

async function main(): Promise<void> {
  try {
    const count = await rollupDailyStats(prisma as unknown as StatsRollupDatabase);
    console.log(`Rolled up ${count} daily stats`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("stats-rollup.js")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
