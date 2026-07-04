import type { FastifyPluginAsync } from "fastify";
import { createClient } from "redis";

type RedisPluginOptions = {
  url: string;
};

export const redisPlugin: FastifyPluginAsync<RedisPluginOptions> = async (app, options) => {
  const redis = createClient({ url: options.url });

  app.decorate("redis", redis);
  app.addHook("onClose", async () => {
    if (redis.isOpen) {
      await redis.close();
    }
  });
};
