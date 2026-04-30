# GitHub Actions CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions workflow at `.github/workflows/ci.yml` that runs two parallel jobs (`checks` and `e2e`) on pull requests targeting `main` and on pushes to `main`.

**Architecture:** Single workflow file with two independent jobs. Job 1 (`checks`) runs lint + typecheck + Vitest. Job 2 (`e2e`) brings up Postgres via a service container, runs Prisma migrations + seed, then runs Playwright. Both jobs use `actions/setup-node@v4` with the npm cache. Concurrency cancels in-progress runs on the same ref.

**Tech Stack:** GitHub Actions, Node 24.15.0, npm, Prisma, Postgres 16, Playwright (Chromium).

**Reference spec:** [`docs/superpowers/specs/2026-04-29-github-actions-ci-design.md`](../specs/2026-04-29-github-actions-ci-design.md)

**Branch:** `ci/github-actions` (already created off `main`).

**Conventions for this plan:**
- All paths are relative to repo root: `/Users/jonathanbirkholz/quorum/quorum_copilot_training`.
- Commit messages use Conventional Commits.
- We can't run a GitHub Actions workflow locally, so each task validates YAML syntax via `python3 -c "import yaml"` and the *final* task pushes the branch and verifies the live run via `gh`.
- Each task ends with a commit. The branch is pushed only in the final task to avoid burning CI minutes on intermediate states.

---

## File Structure

This plan creates exactly one new file:

```
.github/
└── workflows/
    └── ci.yml
```

No existing files are modified. `docker-compose.yml`, `playwright.config.ts`, `package.json`, and `backend/.env.example` are reused as-is.

---

## Task 1: Workflow skeleton — triggers, concurrency, placeholder job

**Files:**
- Create: `.github/workflows/ci.yml`

This task lands a minimal valid workflow that does nothing but echo "ok". This locks in the trigger model and concurrency config. The real jobs come in Tasks 2–4.

- [ ] **Step 1: Create the file with skeleton content**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  checks:
    name: Checks
    runs-on: ubuntu-latest
    steps:
      - name: Placeholder
        run: echo "checks job placeholder"
```

- [ ] **Step 2: Validate YAML parses**

Run:

```bash
python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('ok')"
```

Expected output: `ok` (no traceback).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add workflow skeleton with PR + main triggers"
```

---

## Task 2: Implement the `checks` job (lint + typecheck + Vitest)

**Files:**
- Modify: `.github/workflows/ci.yml`

Replace the placeholder `checks` job with: Postgres service + install deps + generate Prisma client + write CI `.env` + migrate + lint + typecheck + unit tests.

> **Why Postgres in this job:** the backend Vitest suite (`backend/tests/contacts.test.ts`, `me.test.ts`) is an integration suite. `backend/tests/setup.ts` sets a default `DATABASE_URL` pointing at `localhost:5432` and tests use Prisma + supertest end-to-end. So `npm test` needs a live DB.

- [ ] **Step 1: Replace the `checks` job**

Open `.github/workflows/ci.yml` and replace the entire `checks:` block (everything under `jobs:`) with:

```yaml
jobs:
  checks:
    name: Checks
    runs-on: ubuntu-latest
    timeout-minutes: 15

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: copilot
          POSTGRES_PASSWORD: copilot
          POSTGRES_DB: copilot_training
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U copilot -d copilot_training"
          --health-interval 2s
          --health-timeout 2s
          --health-retries 20

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 24.15.0
          cache: npm
          cache-dependency-path: |
            package-lock.json
            backend/package-lock.json
            frontend/package-lock.json

      - name: Install root deps
        run: npm ci

      - name: Install backend deps
        run: npm ci --prefix backend

      - name: Install frontend deps
        run: npm ci --prefix frontend

      - name: Generate Prisma client
        run: npm --prefix backend run prisma:generate

      - name: Write backend/.env for CI
        run: |
          cat > backend/.env <<'EOF'
          DATABASE_URL="postgresql://copilot:copilot@localhost:5432/copilot_training"
          BETTER_AUTH_SECRET="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
          BETTER_AUTH_URL="http://localhost:3000"
          PORT=3000
          FRONTEND_ORIGIN="http://localhost:5173"
          EOF

      - name: Run migrations
        run: npx prisma migrate deploy --schema backend/prisma/schema.prisma

      - name: Lint
        run: npm run lint

      - name: Typecheck (backend)
        run: cd backend && npx tsc --noEmit

      - name: Typecheck (frontend)
        run: cd frontend && npx tsc --noEmit

      - name: Unit tests
        run: npm test
```

Note: this job applies migrations but does **not** run the seed — the backend Vitest tests create their own users via `tests/helpers/auth.ts`. The `e2e` job, by contrast, *does* seed, since the Playwright login flow uses the seeded `alice@example.com` / `bob@example.com` accounts.

- [ ] **Step 2: Confirm sub-package lockfiles exist**

The `cache-dependency-path` lists three lockfiles. Verify they all exist (the cache action errors if any path is missing):

```bash
ls package-lock.json backend/package-lock.json frontend/package-lock.json
```

Expected: all three paths print, no "No such file" errors. If a sub-package lockfile is missing, remove that line from `cache-dependency-path` before continuing.

- [ ] **Step 3: Validate YAML parses**

```bash
python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('ok')"
```

Expected: `ok`.

- [ ] **Step 4: Sanity-check the commands run locally**

The same commands the workflow runs should pass on your machine. `npm test` requires a running Postgres (the backend Vitest suite is an integration suite), so make sure the DB is up first.

```bash
npm run db:up
npm run lint
(cd backend && npx tsc --noEmit)
(cd frontend && npx tsc --noEmit)
npm test
```

> **Why `cd` + `npx` instead of `npm --prefix X exec`:** `npm exec --prefix X` resolves the binary from `X/node_modules/.bin/` but does NOT change the working directory. `tsc` reads `tsconfig.json` from the current working directory, so without `cd` it finds no config and silently exits 0. We need `cd backend && npx tsc --noEmit` for the typecheck to actually run.

> **Why frontend uses `tsc --noEmit` and not `tsc -b --noEmit`:** the frontend has composite project refs (`tsconfig.node.json` is referenced with `composite: true`). When the parent `tsconfig.json` sets `noEmit: true`, `tsc -b` errors with TS6310 ("referenced project may not disable emit"). Plain `tsc --noEmit` typechecks the whole graph without the composite-build constraint.

Expected: all exit 0. If anything fails locally, it will fail in CI — fix it before continuing (or open a separate issue).

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: implement checks job (lint, typecheck, vitest)"
```

---

## Task 3: Add the `e2e` job — Postgres service + setup steps

**Files:**
- Modify: `.github/workflows/ci.yml`

Add the `e2e` job alongside `checks`. This task adds everything *up to* running Playwright (Postgres service, deps, env file, Prisma generate + migrate + seed). Playwright run + artifact upload come in Task 4 to keep diffs reviewable.

- [ ] **Step 1: Append the `e2e` job**

In `.github/workflows/ci.yml`, add a second job under `jobs:` directly after the `checks` job. The full `jobs:` map should now look like:

```yaml
jobs:
  checks:
    # ... (unchanged from Task 2)

  e2e:
    name: E2E
    runs-on: ubuntu-latest
    timeout-minutes: 25

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: copilot
          POSTGRES_PASSWORD: copilot
          POSTGRES_DB: copilot_training
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U copilot -d copilot_training"
          --health-interval 2s
          --health-timeout 2s
          --health-retries 20

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 24.15.0
          cache: npm
          cache-dependency-path: |
            package-lock.json
            backend/package-lock.json
            frontend/package-lock.json

      - name: Install root deps
        run: npm ci

      - name: Install backend deps
        run: npm ci --prefix backend

      - name: Install frontend deps
        run: npm ci --prefix frontend

      - name: Generate Prisma client
        run: npm --prefix backend run prisma:generate

      - name: Write backend/.env for CI
        run: |
          cat > backend/.env <<'EOF'
          DATABASE_URL="postgresql://copilot:copilot@localhost:5432/copilot_training"
          BETTER_AUTH_SECRET="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
          BETTER_AUTH_URL="http://localhost:3000"
          PORT=3000
          FRONTEND_ORIGIN="http://localhost:5173"
          EOF

      - name: Run migrations
        run: npx prisma migrate deploy --schema backend/prisma/schema.prisma

      - name: Seed database
        run: npm --prefix backend run db:seed
```

Note on `BETTER_AUTH_SECRET`: it's a 64-hex-char placeholder string. Fine in plaintext because the database it protects exists for ~5 minutes per CI run and is destroyed with the runner. Not a real secret.

- [ ] **Step 2: Validate YAML parses**

```bash
python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('ok')"
```

Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add e2e job with Postgres service and migration setup"
```

---

## Task 4: Finish the `e2e` job — Playwright run + failure artifacts

**Files:**
- Modify: `.github/workflows/ci.yml`

Add the Playwright browser cache, the install step, the test run, and conditional artifact upload on failure.

- [ ] **Step 1: Append Playwright steps to the `e2e` job**

In `.github/workflows/ci.yml`, append the following steps to the end of the `e2e` job's `steps:` list (after `Seed database`):

```yaml
      - name: Resolve Playwright version
        id: playwright-version
        run: |
          PW_VERSION="$(node -p "require('./package-lock.json').packages['node_modules/@playwright/test'].version")"
          echo "version=$PW_VERSION" >> "$GITHUB_OUTPUT"

      - name: Cache Playwright browsers
        id: playwright-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ steps.playwright-version.outputs.version }}

      - name: Install Playwright browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps chromium

      - name: Install Playwright system deps (cache hit)
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium

      - name: Run E2E tests
        run: npm run e2e

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

      - name: Upload Playwright traces
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-test-results
          path: test-results/
          retention-days: 14
```

Why two install steps: on cache miss we need browsers + system libraries; on cache hit the browser binaries are restored but the apt-installed system libs are not (those don't survive across runners), so we still call `install-deps`.

- [ ] **Step 2: Validate YAML parses**

```bash
python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('ok')"
```

Expected: `ok`.

- [ ] **Step 3: Sanity-check the Playwright version resolution one-liner**

The cache key reads the resolved Playwright version from `package-lock.json`. Verify the same `node -p` expression works locally:

```bash
node -p "require('./package-lock.json').packages['node_modules/@playwright/test'].version"
```

Expected: a version string like `1.59.1` (no error). If this errors, the path inside `package-lock.json` has a different shape and the workflow expression must be adjusted to match.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run Playwright with browser cache and upload reports on failure"
```

---

## Task 5: Push the branch and verify both jobs go green

This is the live integration test. Up to this point we've only validated YAML syntax — the only way to know if the workflow actually works is to run it on GitHub.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin ci/github-actions
```

Expected: branch published; output prints a "Create a pull request" URL.

- [ ] **Step 2: Open the pull request**

```bash
gh pr create --title "Add GitHub Actions CI (checks + e2e)" --body "$(cat <<'EOF'
## Summary
- Adds `.github/workflows/ci.yml` with two parallel jobs:
  - **Checks** — lint + typecheck + Vitest on backend & frontend
  - **E2E** — Playwright against a Postgres service container, with migrations + seed
- Triggers: PRs to `main` and pushes to `main`
- Concurrency cancels in-progress runs on the same ref

## Spec
[`docs/superpowers/specs/2026-04-29-github-actions-ci-design.md`](docs/superpowers/specs/2026-04-29-github-actions-ci-design.md)

## Test plan
- [ ] Both jobs run on this PR
- [ ] Both jobs pass
- [ ] Cancel-in-progress works (push a follow-up commit and confirm the older run is cancelled)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: a PR URL is printed.

- [ ] **Step 3: Watch the run to completion**

```bash
gh pr checks --watch
```

Expected: both `Checks` and `E2E` finish with ✓ green status. The watch command exits when all checks complete.

- [ ] **Step 4: If any job fails — diagnose, fix, push, repeat**

If a job is red:

1. Inspect the failure: `gh run view --log-failed --job <job-id>` (the job ID is shown by `gh pr checks`).
2. Common failure modes and fixes:
   - **`@prisma/client` types not generated** during typecheck → confirm Step "Generate Prisma client" runs *before* typecheck in the `checks` job.
   - **Postgres "connection refused"** → service container hasn't reached healthy state. Increase `--health-retries` from 20 to 40, or add an explicit wait step before migrations.
   - **`prisma migrate deploy` errors with "no migrations found"** → confirm `--schema backend/prisma/schema.prisma` is correct and migrations exist in `backend/prisma/migrations/`.
   - **Playwright browsers not found** → the cache step succeeded but the install step was skipped on cache miss. Check the conditionals on the two install steps.
   - **`webServer` timeout in Playwright** → backend or frontend dev server didn't start in 60s. Investigate logs in the uploaded `playwright-test-results` artifact.
3. Edit `.github/workflows/ci.yml` to apply the fix.
4. Validate YAML parses again (`python3 -c "..."`).
5. Commit with a descriptive message: `git commit -am "ci: <what you fixed>"`.
6. Push: `git push`.
7. Re-run `gh pr checks --watch`.

Repeat until both jobs are green. Do not merge until both jobs pass.

- [ ] **Step 5: (Optional) Verify cancel-in-progress**

Make a no-op commit (e.g., add a trailing newline to the workflow comment), push it within ~30s of the previous push, and confirm via `gh run list` that the older run is marked `cancelled` while the new run takes over.

---

## Self-Review Notes (for plan author)

Verified against the spec:

- ✅ Two parallel jobs (checks + e2e) — Tasks 2, 3, 4
- ✅ Triggers: PR to `main` + push to `main` — Task 1
- ✅ Concurrency cancel-in-progress — Task 1
- ✅ Node 24.15.0 pinned — Task 2 / 3
- ✅ npm cache via `setup-node` — Task 2 / 3
- ✅ Postgres 16 via `services:` (not Compose) — Task 3
- ✅ Prisma generate + migrate deploy + seed — Task 3
- ✅ Playwright browser cache keyed on resolved version — Task 4
- ✅ E2E run via existing `npm run e2e` — Task 4
- ✅ Failure artifacts (`playwright-report/`, `test-results/`) — Task 4
- ✅ Branch `ci/github-actions` — assumed pre-existing per spec
