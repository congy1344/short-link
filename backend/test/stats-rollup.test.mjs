import assert from "node:assert/strict";
import test from "node:test";

import { rollupDailyStats } from "../dist/stats-rollup.js";

test("rollupDailyStats upserts daily click totals", async () => {
  let queryText = "";
  const upserts = [];
  const db = {
    $queryRaw: async (strings) => {
      queryText = strings.raw.join("");
      return [
        {
          linkId: "link_1",
          day: "2026-07-01",
          clicks: 2n,
          uniqueVisitors: 1n
        },
        {
          linkId: "link_2",
          day: new Date("2026-07-02T15:30:00.000Z"),
          clicks: 3,
          uniqueVisitors: 2
        }
      ];
    },
    dailyLinkStat: {
      upsert: async (args) => {
        upserts.push(args);
        return {};
      }
    }
  };

  const count = await rollupDailyStats(db);

  assert.equal(count, 2);
  assert.match(queryText, /COUNT\(DISTINCT "ipHash"\)/);
  assert.equal(upserts.length, 2);
  assert.deepEqual(upserts[0], {
    where: { linkId_day: { linkId: "link_1", day: new Date("2026-07-01T00:00:00.000Z") } },
    update: { clicks: 2, uniqueVisitors: 1 },
    create: { linkId: "link_1", day: new Date("2026-07-01T00:00:00.000Z"), clicks: 2, uniqueVisitors: 1 }
  });
  assert.deepEqual(upserts[1], {
    where: { linkId_day: { linkId: "link_2", day: new Date("2026-07-02T00:00:00.000Z") } },
    update: { clicks: 3, uniqueVisitors: 2 },
    create: { linkId: "link_2", day: new Date("2026-07-02T00:00:00.000Z"), clicks: 3, uniqueVisitors: 2 }
  });
});
