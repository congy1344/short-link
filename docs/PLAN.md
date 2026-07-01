# Implementation Plan

This plan is written for small commits. Each checkbox should be one commit unless it is truly tiny.

## Phase 0 - Repo Baseline

Goal: make the workspace buildable and commit-safe.

- Initialize git if `.git` is missing.
- Add `.gitignore`, `.editorconfig`, root `package.json`, workspace config, and README docs.
- Pick Node.js LTS at implementation time and pin it in `.nvmrc`.
- Add `backend`, `frontend`, and `prisma` folders.
- Verification: `git status`, `npm install`, empty `npm run check` script succeeds.
- Commit examples:
  - `chore(repo): initialize workspace`
  - `docs: seed architecture plan`

## Phase 1 - Database Design

Goal: database constraints own correctness.

- Add Prisma and PostgreSQL datasource.
- Create models:
  - `User`
  - `Link`
  - `ClickEvent`
  - `DailyLinkStat`
- Add unique constraint on `Link.shortCode`.
- Add useful indexes:
  - `Link(ownerId, createdAt)`
  - `ClickEvent(linkId, clickedAt)`
  - `ClickEvent(clickedAt)`
  - `DailyLinkStat(linkId, day)` unique
- Add seed script with one user and two links.
- Verification: migration runs, generated client works, seed inserts data.
- Commit examples:
  - `feat(db): add link analytics schema`
  - `chore(db): add seed data`

## Phase 2 - API Skeleton

Goal: a testable Fastify API with health checks.

- Add Fastify app factory in `backend/src/app.ts`.
- Add config loader from environment variables.
- Add `/healthz`.
- Add Prisma plugin and Redis plugin.
- Add a tiny `node:test` check using `fastify.inject`.
- Verification: API test passes without opening a port.
- Commit examples:
  - `feat(api): add fastify app shell`
  - `test(api): cover health endpoint`

## Phase 3 - Link Creation

Goal: create short links safely.

- Add `POST /links`.
- Validate URL and optional custom alias.
- Generate base62 short code with Node `crypto`.
- Insert directly and catch PostgreSQL unique violation for collision retry.
- Add retry cap and return `409` only after cap is exhausted.
- Verification: unit test stubs collision once and succeeds on retry.
- Commit examples:
  - `feat(api): create short links`
  - `test(api): cover short code collision retry`

## Phase 4 - Redirect And Click Tracking

Goal: redirect fast and record useful analytics.

- Add `GET /:code`.
- Resolve link from Redis cache first.
- On miss, read PostgreSQL and cache active link.
- Record click event with:
  - `linkId`
  - timestamp
  - referrer host
  - user agent family if easy
  - country only if a local lookup is added later
  - HMAC-hashed IP, not raw IP
- Do not let analytics failure break redirect.
- Verification: redirect returns `302`, cache miss becomes hit, click row is recorded.
- Commit examples:
  - `feat(api): redirect short links`
  - `feat(api): record click events`

## Phase 5 - Analytics API

Goal: dashboard reads aggregates, not raw event dumps.

- Add `GET /links` for owner link list.
- Add `GET /links/:id/stats` returning:
  - total clicks
  - unique visitors estimate from hashed IP per period
  - clicks by day
  - top referrers
  - top user agents
- Add daily rollup worker or command that populates `DailyLinkStat`.
- Keep raw event query for last 7 days only if needed.
- Verification: seeded clicks produce expected daily totals.
- Commit examples:
  - `feat(api): expose link stats`
  - `feat(api): add daily stats rollup`

## Phase 6 - Rate Limiting And Abuse Controls

Goal: protect create and redirect endpoints without blocking normal use.

- Add Redis fixed-window limiter first:
  - `POST /links`: stricter per user/IP.
  - `GET /:code`: higher per IP.
- Use atomic Redis operation or Lua for `INCR` plus expiry.
- Add trust proxy config only when behind Render/Nginx.
- Add link status flags: active, disabled, expired.
- Verification: repeated requests return `429` after threshold.
- Commit examples:
  - `feat(api): add redis rate limiting`
  - `feat(api): support disabled links`

## Phase 7 - Dashboard

Goal: useful dashboard without marketing fluff.

- Scaffold React + Vite app.
- Add layout: sidebar, top bar, content region.
- Add pages:
  - link list
  - create link form
  - link detail analytics
- Add charts:
  - clicks over time
  - referrer breakdown
  - device/browser breakdown
- Add loading, empty, and error states.
- Verification: dashboard builds and renders seeded API data.
- Commit examples:
  - `feat(web): scaffold dashboard shell`
  - `feat(web): add link analytics view`

## Phase 8 - Docker

Goal: one command runs the system locally.

- Add API Dockerfile.
- Add web Dockerfile.
- Add `docker-compose.yml` with:
  - api
  - web
  - postgres
  - redis
- Add `.env.example`.
- Add migration command documented in README.
- Verification: `docker compose up --build` starts all services.
- Commit examples:
  - `chore(docker): add local compose stack`
  - `docs: document docker startup`

## Phase 9 - CI/CD

Goal: every PR proves the app still works.

- Add GitHub Actions workflow:
  - install dependencies
  - lint
  - typecheck
  - test
  - build API and web
  - optional Docker build
- Add deploy job only after manual deploy works.
- Pick one deployment path first:
  - Render for fastest public demo.
  - VPS for showing ops depth.
- Verification: workflow passes on a clean push.
- Commit examples:
  - `ci: add test and build workflow`
  - `ci: add docker build check`

## Phase 10 - Production Polish

Goal: fix what interviewers will ask about.

- Add structured logs and request IDs.
- Add `/readyz` checking PostgreSQL and Redis.
- Add backup note for PostgreSQL.
- Add basic security headers.
- Add OpenAPI export only if it helps testing/demo.
- Add load-test note for hot redirects.
- Verification: smoke test after deploy, dashboard works on deployed URL.
- Commit examples:
  - `feat(api): add readiness checks`
  - `docs: add production runbook`

## Phase 11 - Stretch Only If Time Exists

Skip these until the core demo works.

- Custom domains.
- QR codes.
- Team/workspace billing.
- GeoIP enrichment.
- Redis Stream click ingestion.
- Webhook integrations.

Skipped: custom domains and billing. Add when the basic redirect and analytics demo is already deployed.
