export function health() {
  return {
    status: "ok",
    service: "backend"
  } as const;
}

export type ReadinessDatabase = {
  $queryRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
};

export type ReadinessCache = {
  ping(): Promise<unknown>;
};

export async function readiness(db: ReadinessDatabase, cache: ReadinessCache) {
  const [postgres, redis] = await Promise.allSettled([db.$queryRaw`SELECT 1`, cache.ping()]);
  const ok = postgres.status === "fulfilled" && redis.status === "fulfilled";

  return {
    status: ok ? "ok" : "error",
    service: "backend",
    checks: {
      postgres: postgres.status === "fulfilled" ? "ok" : "error",
      redis: redis.status === "fulfilled" ? "ok" : "error"
    }
  } as const;
}
