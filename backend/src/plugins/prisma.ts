import type { FastifyPluginAsync } from "fastify";

import { prisma } from "../db/client.js";

export const prismaPlugin: FastifyPluginAsync = async (app) => {
  app.decorate("prisma", prisma);
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
};
