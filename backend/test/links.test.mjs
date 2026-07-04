import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../dist/app.js";

const config = {
  port: 0,
  databaseUrl: "postgresql://postgres:postgres@localhost:5432/shortlink?schema=public",
  redisUrl: "redis://localhost:6379",
  nodeEnv: "test"
};

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
