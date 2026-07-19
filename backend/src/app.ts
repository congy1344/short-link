import Fastify, { type FastifyReply } from "fastify";

import type { AppConfig } from "./config.js";
import { loadConfig } from "./config.js";
import { prisma } from "./db/client.js";
import { health, readiness, type ReadinessCache, type ReadinessDatabase } from "./health.js";
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
    logger: config.nodeEnv !== "test",
    trustProxy: config.trustedProxy
  });

  app.decorate("config", config);
  app.addHook("onRequest", async (_request, reply) => {
    setSecurityHeaders(reply);
  });

  if (deps.prisma) {
    app.decorate("prisma", deps.prisma);
  } else {
    await prismaPlugin(app, {});
  }

  if (!deps.redis) {
    await redisPlugin(app, { url: config.redisUrl });
  }

  const db = (deps.prisma ?? prisma) as LinkDatabase;
  await app.register(linksRoutes, {
    prisma: db,
    redis: deps.redis ?? app.redis,
    ipHashSecret: config.ipHashSecret,
    ...(deps.codeGenerator ? { codeGenerator: deps.codeGenerator } : {})
  });

  app.get("/healthz", async () => health());
  app.get("/readyz", async (_request, reply) => {
    const result = await readiness((deps.prisma ?? prisma) as ReadinessDatabase, (deps.redis ?? app.redis) as ReadinessCache);
    return result.status === "ok" ? result : reply.code(503).send(result);
  });

  return app;
}

function setSecurityHeaders(reply: FastifyReply): void {
  reply
    .header("X-Content-Type-Options", "nosniff")
    .header("X-Frame-Options", "DENY")
    .header("Referrer-Policy", "no-referrer")
    .header("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
}
