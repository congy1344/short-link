import assert from "node:assert/strict";

const webBaseUrl = baseUrl(process.env.WEB_BASE_URL ?? "http://localhost:3000");
const apiBaseUrl = baseUrl(process.env.API_BASE_URL ?? `${webBaseUrl}/api`);
const redirectBaseUrl = baseUrl(process.env.REDIRECT_BASE_URL ?? webBaseUrl);
const destinationUrl = process.env.SMOKE_DESTINATION_URL ?? "https://example.com/shortlink-smoke";
const customAlias = process.env.SMOKE_ALIAS ?? `smoke-${Date.now().toString(36)}`;

await expectText(webBaseUrl, "Shortlink");

const created = await expectJson(`${apiBaseUrl}/links`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    destinationUrl,
    title: "Smoke deploy check",
    customAlias
  })
}, 201);

assert.equal(created.shortCode, customAlias);
assert.equal(created.destinationUrl, destinationUrl);

const links = await expectJson(`${apiBaseUrl}/links`, {}, 200);
assert.ok(links.links.some((link) => link.id === created.id), "created link should be listed");

const redirect = await fetchWithTimeout(`${redirectBaseUrl}/${created.shortCode}`, {
  redirect: "manual",
  headers: {
    referer: "https://demo.shortlink.local/source",
    "user-agent": "ShortlinkSmoke/1.0"
  }
});

assert.equal(redirect.status, 302);
assert.equal(redirect.headers.get("location"), destinationUrl);

const stats = await expectJson(`${apiBaseUrl}/links/${created.id}/stats?days=30`, {}, 200);
assert.ok(stats.totalClicks >= 1, "redirect should be tracked in analytics");

console.log(`smoke ok: ${webBaseUrl} -> ${created.shortCode} -> ${destinationUrl}`);

function baseUrl(value) {
  return value.replace(/\/$/, "");
}

async function expectText(url, expectedText) {
  const response = await fetchWithTimeout(url);
  const text = await response.text();

  assert.equal(response.status, 200, `${url} should return 200`);
  assert.ok(text.includes(expectedText), `${url} should include "${expectedText}"`);
}

async function expectJson(url, init, expectedStatus) {
  const response = await fetchWithTimeout(url, init);
  const text = await response.text();

  assert.equal(response.status, expectedStatus, `${init.method ?? "GET"} ${url} -> ${response.status}: ${text}`);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${url} did not return JSON: ${text}`);
  }
}

async function fetchWithTimeout(url, init = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
}
