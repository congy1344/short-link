import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../dist/app.js";

const config = {
  port: 0,
  databaseUrl: "postgresql://postgres:postgres@localhost:5432/shortlink?schema=public",
  redisUrl: "redis://localhost:6379",
  ipHashSecret: "test-secret",
  nodeEnv: "test"
};

function createRedisStub(seed = new Map()) {
  return {
    get: async (key) => seed.get(key) ?? null,
    set: async (key, value) => {
      seed.set(key, value);
      return "OK";
    }
  };
}

test("GET /links returns demo owner links with click counts", async (t) => {
  const app = await buildApp(config, {
    redis: createRedisStub(),
    prisma: {
      user: {
        findUnique: async () => ({ id: "user_1" })
      },
      link: {
        findMany: async (args) => {
          assert.equal(args.where.ownerId, "user_1");
          assert.deepEqual(args.orderBy, { createdAt: "desc" });

          return [
            {
              id: "link_new",
              shortCode: "new101",
              destinationUrl: "https://example.com/new",
              title: "New",
              status: "ACTIVE",
              expiresAt: null,
              createdAt: new Date("2026-07-02T00:00:00.000Z"),
              _count: { clickEvents: 5 }
            },
            {
              id: "link_old",
              shortCode: "old101",
              destinationUrl: "https://example.com/old",
              title: null,
              status: "DISABLED",
              expiresAt: new Date("2026-08-01T00:00:00.000Z"),
              createdAt: new Date("2026-07-01T00:00:00.000Z"),
              _count: { clickEvents: 2 }
            }
          ];
        }
      }
    }
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({ method: "GET", url: "/links" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    links: [
      {
        id: "link_new",
        shortCode: "new101",
        destinationUrl: "https://example.com/new",
        title: "New",
        status: "ACTIVE",
        expiresAt: null,
        createdAt: "2026-07-02T00:00:00.000Z",
        totalClicks: 5
      },
      {
        id: "link_old",
        shortCode: "old101",
        destinationUrl: "https://example.com/old",
        title: null,
        status: "DISABLED",
        expiresAt: "2026-08-01T00:00:00.000Z",
        createdAt: "2026-07-01T00:00:00.000Z",
        totalClicks: 2
      }
    ]
  });
});

test("GET /links returns empty list when demo owner is missing", async (t) => {
  const app = await buildApp(config, {
    redis: createRedisStub(),
    prisma: {
      user: {
        findUnique: async () => null
      },
      link: {
        findMany: async () => {
          throw new Error("should not query links without owner");
        }
      }
    }
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({ method: "GET", url: "/links" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { links: [] });
});

test("GET /links/:id/stats returns aggregate click stats", async (t) => {
  const app = await buildApp(config, {
    redis: createRedisStub(),
    prisma: {
      user: {
        findUnique: async () => ({ id: "unused" })
      },
      link: {
        findUnique: async (args) => {
          assert.deepEqual(args.where, { id: "link_1" });
          return { id: "link_1" };
        }
      },
      clickEvent: {
        findMany: async (args) => {
          assert.equal(args.where.linkId, "link_1");
          assert.ok(args.where.clickedAt.gte instanceof Date);

          return [
            {
              clickedAt: new Date("2026-07-01T09:00:00.000Z"),
              referrerHost: "github.com",
              browser: "Chrome",
              ipHash: "ip_1"
            },
            {
              clickedAt: new Date("2026-07-01T10:00:00.000Z"),
              referrerHost: null,
              browser: "Chrome",
              ipHash: "ip_1"
            },
            {
              clickedAt: new Date("2026-07-02T10:00:00.000Z"),
              referrerHost: "",
              browser: null,
              ipHash: "ip_2"
            }
          ];
        }
      }
    }
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({ method: "GET", url: "/links/link_1/stats?days=7" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    totalClicks: 3,
    uniqueVisitors: 2,
    clicksByDay: [
      { day: "2026-07-01", clicks: 2 },
      { day: "2026-07-02", clicks: 1 }
    ],
    topReferrers: [
      { referrer: "direct", clicks: 2 },
      { referrer: "github.com", clicks: 1 }
    ],
    topUserAgents: [
      { userAgent: "Chrome", clicks: 2 },
      { userAgent: "Unknown", clicks: 1 }
    ]
  });
});

test("GET /links/:id/stats rejects invalid days", async (t) => {
  const app = await buildApp(config, {
    redis: createRedisStub(),
    prisma: {
      user: {
        findUnique: async () => ({ id: "unused" })
      },
      link: {
        findUnique: async () => {
          throw new Error("should not query link when days is invalid");
        }
      }
    }
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({ method: "GET", url: "/links/link_1/stats?days=91" });

  assert.equal(response.statusCode, 400);
});

test("GET /links/:id/stats returns 404 for missing links", async (t) => {
  const app = await buildApp(config, {
    redis: createRedisStub(),
    prisma: {
      user: {
        findUnique: async () => ({ id: "unused" })
      },
      link: {
        findUnique: async () => null
      },
      clickEvent: {
        findMany: async () => {
          throw new Error("should not query click events for missing links");
        }
      }
    }
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({ method: "GET", url: "/links/missing/stats" });

  assert.equal(response.statusCode, 404);
});

test("POST /links retries when generated code collides", async (t) => {
  let createCalls = 0;
  const codes = ["taken01", "fresh01"];
  const prisma = {
    user: {
      upsert: async () => ({ id: "user_1" })
    },
    link: {
      create: async (args) => {
        createCalls += 1;

        if (createCalls === 1) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }

        return {
          id: "link_1",
          shortCode: args.data.shortCode,
          destinationUrl: args.data.destinationUrl,
          title: args.data.title
        };
      }
    }
  };

  const app = await buildApp(config, {
    prisma,
    redis: createRedisStub(),
    codeGenerator: () => codes.shift()
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/links",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify({
      destinationUrl: "https://example.com/docs",
      title: "Docs"
    })
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.json().shortCode, "fresh01");
  assert.equal(createCalls, 2);
});

test("POST /links rejects invalid URLs", async (t) => {
  const app = await buildApp(config, {
    redis: createRedisStub(),
    prisma: {
      user: {
        upsert: async () => ({ id: "unused" })
      },
      link: {
        create: async () => {
          throw new Error("should not create invalid links");
        }
      }
    }
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/links",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify({ destinationUrl: "ftp://example.com/file" })
  });

  assert.equal(response.statusCode, 400);
});

test("GET /:code redirects and caches link lookup", async (t) => {
  let findCalls = 0;
  const clickEvents = [];
  const redis = createRedisStub();
  const prisma = {
    user: {
      upsert: async () => ({ id: "unused" })
    },
    link: {
      create: async () => {
        throw new Error("should not create links during redirect");
      },
      findUnique: async () => {
        findCalls += 1;
        return {
          id: "link_1",
          destinationUrl: "https://example.com/docs",
          status: "ACTIVE",
          expiresAt: null
        };
      }
    },
    clickEvent: {
      create: async (args) => {
        clickEvents.push(args.data);
        return {};
      }
    }
  };

  const app = await buildApp(config, { prisma, redis });

  t.after(async () => {
    await app.close();
  });

  const first = await app.inject({
    method: "GET",
    url: "/docs101",
    headers: {
      referer: "https://github.com/acme/project",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36"
    }
  });
  const second = await app.inject({ method: "GET", url: "/docs101" });

  assert.equal(first.statusCode, 302);
  assert.equal(first.headers.location, "https://example.com/docs");
  assert.equal(second.statusCode, 302);
  assert.equal(findCalls, 1);
  assert.equal(clickEvents.length, 2);
  assert.equal(clickEvents[0].linkId, "link_1");
  assert.equal(clickEvents[0].referrerHost, "github.com");
  assert.equal(clickEvents[0].browser, "Chrome");
  assert.equal(clickEvents[0].os, "Windows");
  assert.equal(clickEvents[0].device, "desktop");
  assert.match(clickEvents[0].ipHash, /^[a-f0-9]{64}$/);
});

test("GET /:code redirects when click tracking fails", async (t) => {
  const app = await buildApp(config, {
    redis: createRedisStub(),
    prisma: {
      user: {
        upsert: async () => ({ id: "unused" })
      },
      link: {
        create: async () => {
          throw new Error("should not create links during redirect");
        },
        findUnique: async () => ({
          id: "link_1",
          destinationUrl: "https://example.com/docs",
          status: "ACTIVE",
          expiresAt: null
        })
      },
      clickEvent: {
        create: async () => {
          throw new Error("analytics down");
        }
      }
    }
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({ method: "GET", url: "/docs101" });

  assert.equal(response.statusCode, 302);
  assert.equal(response.headers.location, "https://example.com/docs");
});
