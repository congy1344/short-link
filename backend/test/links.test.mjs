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
