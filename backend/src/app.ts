import Fastify from "fastify";

import type { AppConfig } from "./config.js";
import { loadConfig } from "./config.js";
import { health } from "./health.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { redisPlugin } from "./plugins/redis.js";

export async function buildApp(config: AppConfig = loadConfig()) {
  const app = Fastify({
    logger: config.nodeEnv !== "test"
  });

  app.decorate("config", config);
  await app.register(prismaPlugin);
  await app.register(redisPlugin, { url: config.redisUrl });

  app.get("/healthz", async () => health());

  return app;
}
