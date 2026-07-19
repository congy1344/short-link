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

function createRedisStub(ping = async () => "PONG") {
  return {
    get: async () => null,
    set: async () => "OK",
    eval: async () => 1,
    ping
  };
}

test("GET /healthz returns backend health", async (t) => {
  const app = await buildApp(config, { redis: createRedisStub() });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/healthz"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: "ok",
    service: "backend"
  });
});

test("GET /readyz returns readiness checks", async (t) => {
  const app = await buildApp(config, {
    prisma: {
      $queryRaw: async () => 1
    },
    redis: createRedisStub()
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({ method: "GET", url: "/readyz" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: "ok",
    service: "backend",
    checks: {
      postgres: "ok",
      redis: "ok"
    }
  });
});

test("GET /readyz returns 503 when a dependency is down", async (t) => {
  const app = await buildApp(config, {
    prisma: {
      $queryRaw: async () => {
        throw new Error("database down");
      }
    },
    redis: createRedisStub()
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({ method: "GET", url: "/readyz" });

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), {
    status: "error",
    service: "backend",
    checks: {
      postgres: "error",
      redis: "ok"
    }
  });
});
