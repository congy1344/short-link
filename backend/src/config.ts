export type AppConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  nodeEnv: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 4000),
    databaseUrl: env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/shortlink?schema=public",
    redisUrl: env.REDIS_URL ?? "redis://localhost:6379",
    nodeEnv: env.NODE_ENV ?? "development"
  };
}
