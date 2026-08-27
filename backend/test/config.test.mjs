import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../dist/config.js";

test("loadConfig parses TRUSTED_PROXY booleans", () => {
  assert.equal(loadConfig({ TRUSTED_PROXY: "true" }).trustedProxy, true);
  assert.equal(loadConfig({ TRUSTED_PROXY: "false" }).trustedProxy, false);
  assert.equal(loadConfig({ TRUSTED_PROXY: "127.0.0.1" }).trustedProxy, "127.0.0.1");
});
