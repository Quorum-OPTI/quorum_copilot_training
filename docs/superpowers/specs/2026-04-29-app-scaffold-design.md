# Copilot Training App — Scaffolding Design

- **Date:** 2026-04-29
- **Status:** Approved (pending user review of this written spec)
- **Scope:** This spec covers the application scaffolding only. Domain features (Contact CRUD, search, etc.) are intentionally out of scope and will be planned and implemented in a follow-up PR.

## Context

This repository is a teaching aid for Copilot / Claude Code training at Quorum. The plan is to build a small but realistic full-stack TypeScript app — a contact / address book — and then deliberately introduce bugs, drift, and missing pieces during training sessions so participants can practice AI-assisted refactors, fixes, and feature additions.

This first PR delivers a working skeleton with auth and zero domain features. A trainee can clone the repo, start Postgres in Docker, run the app locally, sign up, log in, and reach an empty authenticated home page. Subsequent PRs will add the contact-book domain on top of this foundation.

## Goals

- Give trainees a realistic, idiomatic 2026-era TS full-stack starting point.
- Make the bootstrap path short and reproducible: clone → install → start DB → run.
- Give the AI tools (Copilot, Claude) maximum useful context: TypeScript everywhere, types shared via real code, schema-as-source-of-truth via Prisma.
- Keep the scaffolding small enough that the next PR (domain features) is the first interesting unit of work.

## Non-goals

- Contact data model, contact CRUD, search, contact UI — next PR.
- Email verification flow, password reset, OAuth providers — Better Auth supports them; not enabled here. They are good candidates for future training lessons.
- Production deployment concerns (TLS, secrets management, observability).
- Multi-tenancy beyond per-user data scoping that auth provides.

## Architecture

Two sibling app folders. Postgres runs in Docker. App code runs natively for fast hot reload.

```
quorum_copilot_training/
├── backend/                  # Express + TS + Prisma + Better Auth
├── frontend/                 # Vite + React + TS + Tailwind + shadcn
├── docs/
│   ├── superpowers/specs/    # design docs (this file)
│   └── lessons/              # placeholder for future lesson plans
├── docker-compose.yml        # postgres only
├── package.json              # root scripts (db:up, dev, test, lint, e2e)
├── .env.example              # DATABASE_URL, BETTER_AUTH_SECRET, etc.
├── README.md
├── .tool-versions            # already present (Node 24.15)
└── .gitignore
```

### Stack summary

| Layer | Choice |
|---|---|
| Language | TypeScript everywhere |
| Frontend framework | React 19 + Vite |
| Styling | Tailwind CSS + shadcn/ui (component sources owned in repo) |
| Frontend data | TanStack Query |
| Frontend forms | react-hook-form + Zod |
| Routing | React Router |
| Backend framework | Express 5 |
| Backend dev runner | `tsx --watch` |
| ORM | Prisma |
| Auth | Better Auth (self-hosted, Prisma adapter) |
| Validation (both sides) | Zod |
| Database | Postgres (Docker) |
| Testing (unit/integration) | Vitest + React Testing Library |
| Testing (E2E) | Playwright |
| Lint / format | ESLint + Prettier |
| Package manager | npm |
| Process orchestration | `concurrently` (root) |

## Backend (`backend/`)

### Layout

```
backend/
├── src/
│   ├── index.ts              # Express bootstrap, mounts routers, listens
│   ├── env.ts                # Zod-validated env loader
│   ├── auth.ts               # Better Auth instance + Express handler mount
│   ├── prisma.ts             # Prisma client singleton
│   ├── middleware/
│   │   └── require-auth.ts   # Express middleware that attaches session/user
│   └── routes/
│       ├── health.ts         # GET /health
│       └── me.ts             # GET /api/me (auth-required example)
├── prisma/
│   ├── schema.prisma         # User, Session, Account, Verification (Better Auth tables)
│   └── migrations/           # initial migration committed
├── tests/
│   └── health.test.ts        # one Vitest smoke test hitting /health
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── eslint.config.js
```

### Key routes

- `GET /health` → `{ status: "ok" }`. No auth.
- `ALL /api/auth/*` → Better Auth's request handler (signup, login, logout, session, etc.).
- `GET /api/me` → returns current user JSON. Requires auth via `require-auth` middleware. Used as the example endpoint for "authenticated route" demos.

### Auth configuration

- Better Auth configured with the Prisma adapter pointing at the Postgres connection from `DATABASE_URL`.
- Email-and-password provider enabled.
- Email verification: **off** (deliberately — leaves room for a future "turn on email verification" lesson).
- Session cookies: HTTP-only, SameSite=Lax, secure off in dev.
- Secret comes from `BETTER_AUTH_SECRET` env var; `.env.example` has a placeholder.

### Env vars (`backend/.env`, gitignored)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | session signing secret |
| `BETTER_AUTH_URL` | base URL of backend (dev: `http://localhost:3000`) |
| `PORT` | backend port (default 3000) |
| `FRONTEND_ORIGIN` | CORS origin (dev: `http://localhost:5173`) |

### Scripts (`backend/package.json`)

- `dev` — `tsx --watch src/index.ts`
- `build` — `tsc`
- `start` — `node dist/index.js`
- `test` — `vitest run`
- `test:watch` — `vitest`
- `lint` — `eslint .`
- `prisma:generate` — `prisma generate`
- `prisma:migrate` — `prisma migrate dev`
- `db:seed` — `tsx prisma/seed.ts`

### Seed (`backend/prisma/seed.ts`)

Creates two demo users via Better Auth's server API (so passwords get hashed correctly through the same code path as real signups):

| Email | Password | Name |
|---|---|---|
| `alice@example.com` | `password123` | Alice Demo |
| `bob@example.com` | `password123` | Bob Demo |

The seed is idempotent: it checks for existing emails before creating. Re-running `npm run setup` does not duplicate users.

## Frontend (`frontend/`)

### Layout

```
frontend/
├── src/
│   ├── main.tsx              # Vite entry, providers, router
│   ├── App.tsx               # route definitions
│   ├── lib/
│   │   ├── auth-client.ts    # Better Auth React client
│   │   └── query-client.ts   # TanStack Query client
│   ├── components/
│   │   ├── ui/               # shadcn-generated components (button, input, card, label, form)
│   │   └── protected-route.tsx
│   ├── pages/
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── home.tsx          # protected; "Welcome, {name}" + Logout button
│   └── styles/
│       └── globals.css       # Tailwind directives, shadcn theme tokens
├── tests/
│   └── login.test.tsx        # one Vitest + RTL smoke test of the login form render
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json           # shadcn config
└── eslint.config.js
```

### Pages

- `/login` — email + password form (react-hook-form + Zod). Calls Better Auth client. On success, redirects to `/`.
- `/signup` — email + password + name form. Same flow.
- `/` — **protected**. Shows "Welcome, {user.name}" and a Logout button.

### Vite proxy

Vite dev server proxies `/api/*` to `http://localhost:3000` to keep cookies same-origin in development.

### shadcn components

The first scaffold pulls in: `button`, `input`, `label`, `card`, `form`. Anything else gets added when the next PR's UI demands it.

### Scripts (`frontend/package.json`)

- `dev` — `vite`
- `build` — `tsc -b && vite build`
- `preview` — `vite preview`
- `test` — `vitest run`
- `test:watch` — `vitest`
- `lint` — `eslint .`

## Database

- Postgres 16 via the official image.
- Single `postgres` service in `docker-compose.yml`.
- Volume mounted for data persistence across restarts.
- Healthcheck so dependent commands can wait on readiness.

### Prisma schema

Only the tables Better Auth requires:

- `User` (id, name, email, emailVerified, image, createdAt, updatedAt)
- `Session` (id, userId, token, expiresAt, ipAddress, userAgent)
- `Account` (id, userId, providerId, accountId, password, …)
- `Verification` (id, identifier, value, expiresAt)

Exact column names match Better Auth's Prisma adapter expectations. Initial migration is generated with `prisma migrate dev --name init` and committed.

## Docker (`docker-compose.yml`)

Single `postgres` service. Example shape:

```yaml
services:
  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: copilot
      POSTGRES_PASSWORD: copilot
      POSTGRES_DB: copilot_training
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U copilot"]
      interval: 2s
      timeout: 2s
      retries: 20

volumes:
  postgres_data:
```

## Root scripts (`package.json`)

The root has no app code, only orchestration. npm workspaces are **not** used — backend and frontend are independent installs. Root scripts shell out into each as needed (`npm run setup` handles installs in all three).

| Script | What it does |
|---|---|
| `db:up` | `docker compose up -d postgres` |
| `db:down` | `docker compose down` |
| `db:reset` | `docker compose down -v && docker compose up -d postgres` |
| `dev` | `concurrently -n be,fe -c blue,green "npm --prefix backend run dev" "npm --prefix frontend run dev"` |
| `test` | runs both sides' Vitest suites in sequence |
| `lint` | runs both sides' ESLint |
| `e2e` | `playwright test` (Playwright config at root) |
| `setup` | one-shot bootstrap (see below) |

### `npm run setup` — what it does

Single command a trainee runs after `git clone` and `npm run db:up`. It must be idempotent (safe to re-run). In order:

1. `npm install` at root (installs `concurrently`, Playwright, etc.).
2. `npm install` in `backend/`.
3. `npm install` in `frontend/`.
4. `npm --prefix backend run prisma:generate` — generates Prisma client.
5. `npm --prefix backend run prisma:migrate` — applies pending migrations (creates Better Auth tables on first run, no-op afterward).
6. `npm --prefix backend run db:seed` — seeds demo users so trainees have logins ready out of the box.

Implementation: a small `scripts/setup.mjs` (or a chained npm script) at root invokes each step and exits non-zero on failure. Postgres must already be running (`db:up` first) — the script checks the connection and prints a clear error if not.

## Testing

- **Unit / integration:** Vitest on both sides. The scaffold includes one smoke test per side so the test infrastructure is real, not aspirational.
- **E2E:** Playwright at root. Single smoke spec: open `/signup`, register a unique user, expect "Welcome" on the home page. The test boots the dev servers via `webServer` config (or assumes `npm run dev` is already running — TBD during implementation; both are reasonable).
- All test commands runnable from root.

## Tooling

- **ESLint:** flat config (`eslint.config.js`) with `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks` on the frontend; `@typescript-eslint` on the backend.
- **Prettier:** shared config at root, both sides reference it.
- **TS configs:** `strict: true` everywhere, `noUncheckedIndexedAccess: true` on both.

## README requirements

The README must cover, in order:

1. What the project is (one paragraph: Copilot training playground, contact-book domain).
2. Prerequisites: Node 24.15 (mention `.tool-versions` / asdf), Docker.
3. First-time setup: `npm run db:up` then `npm run setup` from root (handles installs, Prisma generate, migrations, and seed).
4. Daily dev: `npm run db:up` then `npm run dev`. URLs: frontend at `:5173`, backend at `:3000`. Demo logins (`alice@example.com` / `password123`) are seeded.
5. Test commands.
6. Where lessons live (`docs/lessons/` placeholder).
7. Project layout overview.

## Acceptance criteria

- `git clone` → `npm run db:up` → `npm run setup` → `npm run dev` → working app within ~5 minutes.
- `npm run setup` is idempotent: re-running it on an already-bootstrapped repo succeeds without duplicating data.
- `npm run db:up && npm run dev` brings up backend (`:3000`) and frontend (`:5173`) with hot reload.
- Seeded demo users (`alice@example.com`, `bob@example.com`, password `password123`) can log in immediately after `setup`.
- Browser flow works: visit `/signup`, register, get redirected to `/`, see "Welcome, {name}", click Logout, land on `/login`.
- `npm test` from root passes.
- `npm run e2e` from root passes the signup-to-home smoke spec.
- `npm run lint` from root is clean.
- `docs/lessons/` exists (empty or with a placeholder README).
- A git branch exists for this work, separate from `main`.

## Out-of-scope reminders

These are deliberate omissions, not oversights:

- No `Contact` model in `schema.prisma` yet.
- No contact-related routes or pages.
- No email verification, password reset, OAuth.
- No CI configuration (GitHub Actions etc.) — deferable.
- No production Dockerfiles for frontend/backend — only the dev-time Postgres container.

## Open questions for implementation

- Playwright `webServer` config: launch dev servers automatically vs. require manual `npm run dev`. Lean toward automatic for trainee friendliness.
- Whether to commit a `.env` (with non-secret dev values) in addition to `.env.example`. Lean toward `.env.example` only.
