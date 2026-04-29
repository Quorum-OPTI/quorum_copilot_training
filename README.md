# Quorum Copilot Training

A small full-stack TypeScript app — a contact / address book — used as a playground for Copilot and Claude Code training. The app is deliberately kept simple so trainees can practice AI-assisted refactors, fixes, and feature additions on top of a working baseline.

## Status

Scaffolding (this PR). Auth works; the contact-book domain ships in a follow-up PR.

## Prerequisites

- **Node 24.15** — see `.tool-versions` (works with `asdf`, `mise`, `fnm`, etc.)
- **Docker** — for Postgres

## First-time setup

```bash
git clone <this repo>
cd quorum_copilot_training
npm run db:up        # starts Postgres in Docker
npm run setup        # installs deps everywhere, generates Prisma client, migrates, seeds demo users
```

Edit `backend/.env` and replace `BETTER_AUTH_SECRET` with a long random string. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` produces one.

## Running the app

```bash
npm run db:up        # idempotent; safe to re-run
npm run dev          # starts backend (:3000) and frontend (:5173) concurrently
```

Visit http://localhost:5173.

**Seeded demo logins** (created by `npm run setup`):

| Email | Password |
|---|---|
| alice@example.com | password123 |
| bob@example.com | password123 |

## Tests

```bash
npm test             # backend + frontend Vitest suites
npm run e2e          # Playwright E2E (signup → home smoke spec)
npm run lint         # ESLint everywhere
```

## Project layout

```
backend/    Express + Prisma + Better Auth (port 3000)
frontend/   Vite + React + Tailwind + shadcn (port 5173)
e2e/        Playwright specs
scripts/    Setup automation
docs/
  superpowers/specs/   Design docs
  superpowers/plans/   Implementation plans
  lessons/             Lesson plans (added in future PRs)
```

## Why this stack?

See [`docs/superpowers/specs/2026-04-29-app-scaffold-design.md`](docs/superpowers/specs/2026-04-29-app-scaffold-design.md) for the full design rationale.

## Useful scripts

| Command | What it does |
|---|---|
| `npm run db:up` | Start Postgres in Docker |
| `npm run db:down` | Stop Postgres |
| `npm run db:reset` | Drop the volume and restart Postgres clean |
| `npm run dev` | Run backend + frontend concurrently |
| `npm run setup` | Bootstrap deps, migrations, seed (idempotent) |
| `npm test` | Vitest on both apps |
| `npm run e2e` | Playwright E2E |
| `npm run lint` | ESLint on both apps |
