import Fastify from "fastify";

import type { AppConfig } from "./config.js";
import { loadConfig } from "./config.js";
import { prisma } from "./db/client.js";
import { health } from "./health.js";
import type { CodeGenerator, LinkCache, LinkDatabase } from "./links.js";
import { linksRoutes } from "./links.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { redisPlugin } from "./plugins/redis.js";

export type AppDeps = {
  prisma?: LinkDatabase;
  redis?: LinkCache;
  codeGenerator?: CodeGenerator;
};

export async function buildApp(config: AppConfig = loadConfig(), deps: AppDeps = {}) {
  const app = Fastify({
    logger: config.nodeEnv !== "test"
  });

  app.decorate("config", config);
  if (deps.prisma) {
    app.decorate("prisma", deps.prisma);
  } else {
    await app.register(prismaPlugin);
  }

  if (!deps.redis) {
    await app.register(redisPlugin, { url: config.redisUrl });
  }

  await app.register(linksRoutes, {
    prisma: deps.prisma ?? prisma,
    redis: deps.redis ?? app.redis,
    ...(deps.codeGenerator ? { codeGenerator: deps.codeGenerator } : {})
  });

  app.get("/healthz", async () => health());

  return app;
}
