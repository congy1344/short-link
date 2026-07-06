import type { FastifyPluginAsync } from "fastify";
import { createClient } from "redis";

import type { LinkCache } from "../links.js";

declare module "fastify" {
  interface FastifyInstance {
    redis: LinkCache;
  }
}

type RedisPluginOptions = {
  url: string;
};

export const redisPlugin: FastifyPluginAsync<RedisPluginOptions> = async (app, options) => {
  const redis = createClient({ url: options.url });
  await redis.connect();

  app.decorate("redis", redis as unknown as LinkCache);
  app.addHook("onClose", async () => {
    if (redis.isOpen) {
      await redis.close();
    }
  });
};
