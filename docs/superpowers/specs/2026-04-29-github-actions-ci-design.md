# GitHub Actions CI Design

**Date:** 2026-04-29
**Status:** Draft
**Branch:** `ci/github-actions`

## Goal

Add a GitHub Actions CI workflow that runs on every pull request targeting `main` and on every push to `main`, giving the team fast feedback on code quality (lint + typecheck + unit tests) and end-to-end correctness (Playwright) before changes merge.

This is the first CI for this repo — there is no existing `.github/` directory.

## Non-goals

- No deploy/release automation.
- No matrix testing across Node versions (single pinned version, see Decisions).
- No code coverage reporting, security scanning, or dependency audits in this iteration.
- No reuse of `docker-compose.yml` from CI.

## Trigger model

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
```

PR runs catch problems before merge; `main` runs catch any post-merge breakage and serve as the source of truth for "is `main` green?"

A top-level `concurrency` group cancels in-progress runs when a new commit is pushed to the same ref:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Architecture: two parallel jobs

The workflow defines two independent jobs that run in parallel. Splitting them means lint failures don't wait behind a slower browser run, and developers see the fast signal first.

### Job 1 — `checks` (fast lane)

Runs lint + typecheck + Vitest on both backend and frontend. Target runtime: ~1–2 minutes.

Steps:

1. `actions/checkout@v4`
2. `actions/setup-node@v4` with `node-version: 24.15.0` and `cache: npm`. The cache key includes the lockfiles in root, `backend/`, and `frontend/`.
3. Install deps:
   - `npm ci` at the repo root
   - `npm ci --prefix backend`
   - `npm ci --prefix frontend`
4. Generate the Prisma client: `npm --prefix backend run prisma:generate`. The backend's typecheck imports types from `@prisma/client`, so this must run before typecheck.
5. Lint: `npm run lint` (the root script that runs both `backend` and `frontend` ESLint).
6. Typecheck:
   - Backend: `npm --prefix backend exec -- tsc --noEmit`
   - Frontend: `npm --prefix frontend exec -- tsc -b --noEmit` (matches the `tsc -b && vite build` pattern in `frontend/package.json`)
7. Unit tests: `npm test` (root script — runs Vitest in both packages).

### Job 2 — `e2e` (Playwright)

Runs in parallel with `checks`. Brings up a Postgres service container, applies migrations, seeds demo data, then runs the Playwright suite.

Postgres service container (matches `docker-compose.yml` env so the seed and migrations behave the same as local):

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: copilot
      POSTGRES_PASSWORD: copilot
      POSTGRES_DB: copilot_training
    ports: ["5432:5432"]
    options: >-
      --health-cmd "pg_isready -U copilot -d copilot_training"
      --health-interval 2s
      --health-timeout 2s
      --health-retries 20
```

Steps:

1. `actions/checkout@v4`
2. `actions/setup-node@v4` (same Node version + npm cache config as Job 1).
3. Install deps (same three `npm ci` calls).
4. Cache Playwright browsers at `~/.cache/ms-playwright`, keyed on the resolved `@playwright/test` version from `package-lock.json` (so cache busts when Playwright is upgraded). Then `npx playwright install --with-deps chromium` — the install step is fast on a cache hit.
5. Write a CI `backend/.env` mirroring `backend/.env.example`:
   - `DATABASE_URL=postgresql://copilot:copilot@localhost:5432/copilot_training`
   - `BETTER_AUTH_SECRET` — a hardcoded 64-hex-char string in the workflow YAML. Fine for CI since the database is torn down with the runner; not a real secret.
   - `BETTER_AUTH_URL=http://localhost:3000`
   - `PORT=3000`
   - `FRONTEND_ORIGIN=http://localhost:5173`
6. Generate the Prisma client: `npm --prefix backend run prisma:generate`.
7. Apply migrations against the running Postgres: `npx prisma migrate deploy --schema backend/prisma/schema.prisma`.
8. Seed demo users: `npm --prefix backend run db:seed`.
9. Run E2E: `npm run e2e`. The existing `playwright.config.ts` already starts both `backend` and `frontend` dev servers via its `webServer` block, so no extra wiring is needed.
10. On failure, upload artifacts:
    - `playwright-report/` (HTML report)
    - `test-results/` (traces, screenshots, videos)

   Use `if: failure()` so successful runs don't waste artifact storage.

## Decisions and trade-offs

| Question | Decision | Why |
|---|---|---|
| Scope of checks | Two parallel jobs (fast checks + E2E) | Fast lint/test signal isn't blocked by browser run; both still gate every PR |
| Triggers | PRs to `main` + pushes to `main` | PR runs gate merges; `main` runs catch post-merge breakage |
| Node version | Pin `24.15.0`, no matrix | Training playground doesn't need multi-version coverage; matches `.tool-versions` |
| Postgres source | GitHub Actions `services:` block | Native, faster cold start than Compose; keeps CI separate from local Docker |
| Concurrency | Cancel in-progress on same ref | Avoids wasted minutes when developers push rapid follow-up commits to a PR |

## File changes

- **New:** `.github/workflows/ci.yml` — the workflow file described above.
- No changes to existing files. `docker-compose.yml`, `playwright.config.ts`, and the `package.json` scripts are reused as-is.

## Branch and PR

- Branch: `ci/github-actions` off `main`.
- The PR will include this design doc plus `.github/workflows/ci.yml`.
- Verification: open the PR and confirm both jobs run and pass against the contacts feature already on `main`.

## Open questions

None at this time.

## Out of scope (future iterations)

- Coverage reporting (e.g., Codecov upload).
- Required-status-check enforcement on `main` via branch protection rules — must be configured in the GitHub repo settings, not in the workflow.
- Caching the Vite/TypeScript build output.
- Dependency review / `npm audit` step.
- Auto-format check (`prettier --check`) — could be added to Job 1 later.
