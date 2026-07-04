import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../dist/app.js";

test("GET /healthz returns backend health", async (t) => {
  const app = await buildApp({
    port: 0,
    databaseUrl: "postgresql://postgres:postgres@localhost:5432/shortlink?schema=public",
    redisUrl: "redis://localhost:6379",
    nodeEnv: "test"
  });

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
