# Shortlink

Shortlink is a Fastify, PostgreSQL, Redis, and Next.js dashboard for creating short links and viewing click analytics.

## Local Docker

Copy the sample environment if needed:

```bash
cp .env.example .env
```

Start the stack:

```bash
docker compose up --build
```

The `migrate` and `seed` services prepare demo data before the API starts. The dashboard is available at `http://localhost:3000`, the API health check is at `http://localhost:4000/healthz`, and readiness is at `http://localhost:4000/readyz`.

## Local Node

Install dependencies and run checks:

```bash
npm install
npm run build
npm test
```

Run a migration against the configured `DATABASE_URL`:

```bash
npm run db:deploy --workspace @shortlink/backend
```
