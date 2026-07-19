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

Run the deploy smoke check after the stack is up:

```bash
npm run smoke
```

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

## Deploy

Fastest demo path: deploy the Docker Compose stack on one host with PostgreSQL, Redis, API, and web together.

Required production values:

```bash
POSTGRES_PASSWORD=<strong password>
IP_HASH_SECRET=<random long secret>
NODE_ENV=production
WEB_PORT=3000
```

Start or update:

```bash
docker compose up --build -d
npm run smoke
```

For split services, give the API `DATABASE_URL`, `REDIS_URL`, `IP_HASH_SECRET`, and `TRUSTED_PROXY` if it sits behind a proxy. Build the web service with `API_INTERNAL_ORIGIN` pointing at the API origin, then verify with:

```bash
WEB_BASE_URL=https://your-web.example.com npm run smoke
```
