import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = new Set();
let shuttingDown = false;
const apiHealthUrl = new URL("/healthz", process.env.API_INTERNAL_ORIGIN ?? "http://localhost:4000");

const build = spawn(npm, ["run", "build", "--workspace", "@shortlink/backend"], {
  cwd: process.cwd(),
  env: process.env,
  shell: process.platform === "win32",
  stdio: "inherit"
});

const buildCode = await new Promise((resolve) => build.once("exit", resolve));
if (buildCode !== 0) {
  process.exit(buildCode ?? 1);
}

const api = start(["run", "start", "--workspace", "@shortlink/backend"]);
await waitForApi(api);

const web = start(["run", "dev", "--workspace", "@shortlink/frontend"]);

await new Promise((resolve) => {
  api.once("exit", (code) => resolve(code ?? 1));
  web.once("exit", (code) => resolve(code ?? 0));
});

await stopAll();

function start(args) {
  const child = spawn(npm, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit"
  });

  children.add(child);
  child.once("exit", () => children.delete(child));
  return child;
}

async function waitForApi(child) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error("API stopped before it became ready.");
    }

    try {
      const response = await fetch(apiHealthUrl);
      if (response.ok) return;
    } catch {
      // Keep polling while the API is starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  await stopAll();
  throw new Error("API did not become ready within 30 seconds.");
}

async function stopAll() {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    child.kill("SIGTERM");
  }
}

process.once("SIGINT", async () => {
  await stopAll();
  process.exit(130);
});

process.once("SIGTERM", async () => {
  await stopAll();
  process.exit(143);
});
