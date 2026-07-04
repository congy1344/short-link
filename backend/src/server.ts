import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = await buildApp(config);

await app.listen({
  host: "0.0.0.0",
  port: config.port
});
