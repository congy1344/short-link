export type AppConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  ipHashSecret: string;
  nodeEnv: string;
  trustedProxy: string | boolean;
};

function parseTrustedProxy(value: string | undefined): string | boolean {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;

  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 4000),
    databaseUrl: env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/shortlink?schema=public",
    redisUrl: env.REDIS_URL ?? "redis://localhost:6379",
    ipHashSecret: env.IP_HASH_SECRET ?? "dev-only-change-me",
    nodeEnv: env.NODE_ENV ?? "development",
    trustedProxy: parseTrustedProxy(env.TRUSTED_PROXY)
  };
}
