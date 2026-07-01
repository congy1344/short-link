export function health() {
  return {
    status: "ok",
    service: "backend"
  } as const;
}
