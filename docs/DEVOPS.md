# DevOps Plan

## Local Docker Compose

Services:

```text
postgres  PostgreSQL with persistent volume
redis     Redis for cache and rate limits
api       Fastify API
web       React static app served by nginx or Vite preview for local only
```

Local commands after implementation:

```bash
docker compose up --build
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed
```

## Environment Variables

```text
DATABASE_URL=postgresql://shortlink:shortlink@postgres:5432/shortlink
REDIS_URL=redis://redis:6379
BASE_URL=http://localhost:3000
API_URL=http://localhost:4000
IP_HASH_SECRET=change-me
NODE_ENV=development
```

Keep real secrets out of git. Commit `.env.example`, not `.env`.

## GitHub Actions

One workflow first:

```text
on: pull_request, push main
jobs:
  check:
    services: postgres, redis
    steps:
      checkout
      setup node
      npm ci
      npm run lint
      npm run typecheck
      npm test
      npm run build
```

Add Docker build check after Dockerfiles exist.

Use least privilege:

```yaml
permissions:
  contents: read
```

Raise permissions only for deploy jobs that need them.

## Render Deploy

Good first public demo because it is fast.

- PostgreSQL: Render managed database.
- Redis: Render Redis or external provider.
- API: Web Service from Dockerfile.
- Web: Static Site from `frontend/dist`.
- Set `BASE_URL`, `DATABASE_URL`, `REDIS_URL`, and `IP_HASH_SECRET` in Render dashboard.

Tradeoff: less ops depth, but fastest shareable URL.

## VPS Deploy

Use this if the interview/demo should show operations.

- Ubuntu VPS.
- Docker and Docker Compose plugin.
- Nginx reverse proxy with TLS.
- `docker compose -f docker-compose.prod.yml up -d`.
- PostgreSQL volume backup with scheduled `pg_dump`.
- Deploy via GitHub Actions SSH after CI passes.

Minimum production checklist:

- TLS enabled.
- `NODE_ENV=production`.
- API behind reverse proxy.
- Health and readiness endpoints monitored.
- PostgreSQL backup script tested once.
- Redis persistence optional for cache, not required for source of truth.

## Deployment Choice

Start with Render. Move to VPS only after the core demo works.

Skipped: Kubernetes. Add only when there are multiple services that need orchestration beyond one VPS.
