import { spawnSync } from "node:child_process";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/shortlink?schema=public";

const command = process.platform === "win32" ? "prisma.cmd" : "prisma";
const result = spawnSync(command, process.argv.slice(2), {
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);
