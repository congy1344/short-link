# AGENTS.md

## CodeGraph

This repo has `.codegraph/`. Use CodeGraph before grep/find or reading source code when locating or understanding code.

Preferred tools:

- `codegraph_explore` for architecture and flow questions.
- `codegraph_node` for reading a specific source file or symbol.

## Project Rules

- Follow [docs/PLAN.md](docs/PLAN.md) phase order.
- Keep commits small and feature-scoped.
- Run the smallest relevant check before each commit.
- Do not add dependencies before checking the existing package files.
- Prefer boring platform features and existing repo patterns.
- Update docs when architecture, setup, or commands change.

## Commit Rules

If `.git/` is missing, initialize git before implementation work.

After each small feature:

```bash
git status --short
git add <only-related-files>
git commit -m "<type(scope): message>"
```

Backend and frontend commits stay separate:

- Backend feature commits only stage `backend` and required backend docs.
- Frontend feature commits only stage `frontend` and required frontend docs.
- Root config, Docker, CI, and shared docs are separate commits.
- Do not use `git add .` for feature work.

Examples:

- `feat(api): create short links`
- `test(api): cover collision retry`
- `feat(web): add link stats chart`
- `chore(docker): add compose stack`

## Current Product Direction

- Backend: Node.js LTS, TypeScript, Fastify.
- Database: PostgreSQL with Prisma migrations.
- Cache/rate limiting: Redis.
- Frontend: React + Vite dashboard.
- DevOps: Docker Compose, GitHub Actions, Render first or VPS later.

Read [CODEX_NEXT_SESSION.md](CODEX_NEXT_SESSION.md) when resuming work from a fresh session.
