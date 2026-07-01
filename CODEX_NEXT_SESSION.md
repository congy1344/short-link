# Codex Next Session Handoff

Paste this file into a fresh Codex session before continuing.

## Current State

- Workspace: `D:\.shortlink`
- Project: URL shortener and link analytics tool.
- Current repo has planning docs only.
- `.codegraph/` exists.
- `.git/` did not exist when these docs were created.
- No app code has been scaffolded yet.

## Required Behavior

1. Read `AGENTS.md`, `README.md`, `docs/PLAN.md`, `docs/ARCHITECTURE.md`, `docs/DEVOPS.md`, `docs/INTERVIEW_NOTES.md`, and `design.md`.
2. Because `.codegraph/` exists, use CodeGraph before grep/find or reading source code.
3. If `.git/` is missing, run `git init` before code work.
4. Work through `docs/PLAN.md` from the first incomplete phase.
5. After every smallest working feature:
   - run the smallest relevant check
   - run `git status --short`
   - `git add` only the files for that feature
   - commit with a conventional commit message
6. Do not batch unrelated work into one commit.
7. Keep backend and frontend commits separate:
   - backend work stages only `backend` plus required backend docs
   - frontend work stages only `frontend` plus required frontend docs
   - root config, Docker, CI, and shared docs get their own commits
8. Do not use `git add .` for feature work.
9. Do not add a dependency before checking `package.json`.
10. Use current official docs for framework/library APIs before implementing unfamiliar setup.

## Skills To Use

- `ponytail`: keep implementation small, stdlib/native first, no speculative abstractions.
- `make-plan`: use only when the plan changes materially.
- `browser:control-in-app-browser`: use when checking frontend screenshots or local UI behavior.
- `design-taste-frontend`: use only for anti-slop visual checks. This is a dashboard, not a landing page.
- `skill-installer`: only if the user names a specific missing skill to install.

No external skill was installed during the documentation session because no missing skill name was provided.

## Next Task

Start Phase 0 from `docs/PLAN.md`:

1. Initialize git if needed.
2. Commit the existing documentation as `docs: seed shortlink project plan`.
3. Add workspace scaffold:
   - root `package.json`
   - `.gitignore`
   - `.editorconfig`
   - `backend`
   - `frontend`
   - `prisma`
4. Add empty scripts that can pass:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
5. Commit as `chore(repo): initialize workspace`.

## Commit Granularity Examples

- `feat(db): add link analytics schema`
- `feat(api): add fastify app shell`
- `feat(api): create short links`
- `test(api): cover short code collision retry`
- `feat(web): scaffold dashboard shell`
- `chore(docker): add local compose stack`
- `ci: add test and build workflow`

## Definition Of Done For Each Feature

- Code compiles.
- The smallest relevant test/check passes.
- README or docs are updated if behavior changed.
- Git status is clean after commit.

## Guardrails

- Collision handling belongs in PostgreSQL unique constraint plus retry.
- Redis is cache/rate-limit state, not source of truth.
- Redirect must not fail just because analytics write failed.
- Store hashed IP, not raw IP.
- Skip custom domains, billing, QR codes, and Redis Streams until the MVP is deployed.
