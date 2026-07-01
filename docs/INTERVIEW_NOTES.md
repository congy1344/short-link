# Interview Notes

## 1. Short Code Collision Handling

Problem:

Random short codes can collide, especially as the table grows or under concurrent requests.

Solution:

- Put a unique constraint on `links.short_code`.
- Generate a code with Node `crypto`.
- Insert immediately.
- If PostgreSQL returns unique violation, retry with a new code.
- Do not do `SELECT` before `INSERT`; that has a race.

Good interview line:

The database is the lock. The app retries on the only failure that matters.

## 2. Redirect Latency Versus Analytics Accuracy

Problem:

A redirect should feel instant, but analytics writes can be slow or fail.

Solution:

- Resolve destination from Redis first.
- Use PostgreSQL fallback on cache miss.
- Record click metadata separately from link lookup.
- Do not fail the redirect because analytics insert failed.
- If traffic grows, move click events to Redis Stream plus a worker and batch insert to PostgreSQL.

Good interview line:

The user-facing redirect path is optimized for lookup. Analytics is important, but it should degrade without breaking the redirect.

## 3. Rate Limiting In A Multi-Instance API

Problem:

In-memory rate limit works locally but fails when there are multiple API containers.

Solution:

- Use Redis as shared state.
- Key by action and identity, for example `rl:create:ip:window`.
- Use atomic increment plus expiry.
- Return `429` with `Retry-After`.
- Configure trusted proxy headers only after deployment path is known.

Good interview line:

Rate limiting has to be shared across instances, otherwise scaling the API accidentally scales the attack budget.

## Bonus: Privacy-Safe Analytics

Problem:

Click analytics often wants IP and user-agent data, but raw IP storage is sensitive.

Solution:

- Store HMAC-hashed IP with a secret.
- Store coarse device/browser/referrer fields.
- Avoid raw IP in logs and database.
- Add retention cleanup for raw click rows if needed.

Good interview line:

I only store the minimum data needed for product analytics, and I keep the hash secret outside the database.
