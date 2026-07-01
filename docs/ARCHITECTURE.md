# Architecture Notes

## Principles

- PostgreSQL owns uniqueness and referential integrity.
- Redis improves latency but is not the source of truth.
- Redirect must stay fast even if analytics is degraded.
- Dashboard reads aggregate endpoints by default.
- PII is minimized: store hashed IP, not raw IP.

## Data Model

```text
User
  id
  email unique
  passwordHash
  createdAt

Link
  id
  ownerId -> User.id
  shortCode unique
  destinationUrl
  title
  status active | disabled
  expiresAt nullable
  createdAt
  updatedAt

ClickEvent
  id
  linkId -> Link.id
  clickedAt
  referrerHost nullable
  userAgent nullable
  browser nullable
  os nullable
  device nullable
  ipHash nullable

DailyLinkStat
  id
  linkId -> Link.id
  day
  clicks
  uniqueVisitors
  unique(linkId, day)
```

## Indexes

| Table | Index | Reason |
| --- | --- | --- |
| `Link` | unique `shortCode` | Collision handling and redirect lookup. |
| `Link` | `(ownerId, createdAt desc)` | Dashboard link list. |
| `ClickEvent` | `(linkId, clickedAt desc)` | Stats for one link over time. |
| `ClickEvent` | `(clickedAt)` | Cleanup and batch rollups. |
| `DailyLinkStat` | unique `(linkId, day)` | Idempotent rollups. |

PostgreSQL unique constraints automatically create unique B-tree indexes for the constrained columns. That is why collision handling belongs in the insert path, not in a separate pre-check.

## Short Code Generation

Default:

- Alphabet: `0-9a-zA-Z`.
- Length: 7 for MVP.
- Generator: Node `crypto.randomBytes`, mapped to base62.
- Insert link and catch unique violation.
- Retry up to 5 times.
- If retries are exhausted, return `409` or increase length to 8 in a later commit.

Why not pre-check?

- `SELECT` then `INSERT` has a race condition.
- A unique constraint is simpler and correct under concurrency.

## Collision Flow

```text
generate code
try insert
  success -> return link
  unique violation -> retry with a new code
  other error -> fail
after retry cap -> 409
```

## Redirect Flow

```text
GET /:code
  validate code format
  read Redis link:{code}
    hit -> redirect
    miss -> read PostgreSQL Link by shortCode
      not found/disabled/expired -> 404 or 410
      found -> cache destination and metadata
  record click event
  return 302 destinationUrl
```

For MVP, click recording can be a direct insert that does not block redirect failure handling. If redirect latency becomes a problem, move click writes to a Redis Stream and a worker.

## Redis Keys

| Key | Value | TTL |
| --- | --- | --- |
| `link:{shortCode}` | destination URL and status metadata | 10 to 60 minutes |
| `rl:{scope}:{id}:{window}` | request count | window plus small buffer |
| `stats:hot:{linkId}` | optional short-lived counters | 1 to 5 minutes |

Invalidate `link:{shortCode}` when a link is updated, disabled, or deleted.

## Rate Limiting

Use Redis fixed window first because it is enough for the demo and easy to explain.

- Public redirect: high limit per IP.
- Link creation: lower limit per user and IP.
- Login/register later: strict per IP and email.

Implementation guard:

- Use one atomic Redis operation or Lua script for increment plus expiry.
- Do not use per-process memory for limits.
- Respect proxy headers only after `trustProxy` is configured for the deployment.

Redis documents `INCR` plus `EXPIRE` as a rate limiter pattern and calls out the race when expiry is not guaranteed. Use a Lua script if the chosen Redis client does not expose a safe helper.

## API Surface

```text
GET    /healthz
GET    /readyz
POST   /links
GET    /links
GET    /links/:id
PATCH  /links/:id
DELETE /links/:id
GET    /links/:id/stats
GET    /:code
```

Auth can start as a simple owner stub for the first vertical slice. Add real auth after link creation, redirect, and analytics work end to end.

## Analytics Queries

Dashboard endpoints should return pre-shaped data:

```json
{
  "totalClicks": 1280,
  "uniqueVisitors": 944,
  "clicksByDay": [{ "day": "2026-07-01", "clicks": 48 }],
  "topReferrers": [{ "referrer": "github.com", "clicks": 31 }],
  "topDevices": [{ "device": "mobile", "clicks": 420 }]
}
```

Do not expose raw click events until there is a clear UI need.

## Error Handling

- `400`: invalid URL or short code format.
- `404`: short code does not exist.
- `410`: expired or disabled link.
- `409`: custom alias already exists or generated collisions exceeded retry cap.
- `429`: rate limit exceeded.
- `500`: unexpected server failure.

## Security Notes

- Validate destination URL and allow only `http:` and `https:`.
- Reject localhost/private IP targets unless explicitly allowed for dev.
- Hash IP with HMAC secret before storing.
- Never log full destination URLs with sensitive query strings in production logs.
- Add abuse controls before public deploy.
