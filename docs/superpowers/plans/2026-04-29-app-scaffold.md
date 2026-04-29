# App Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working Express + React + Postgres skeleton with Better Auth, runnable via `npm run db:up && npm run dev` after `npm run setup`. No domain features.

**Architecture:** Two sibling apps (`backend/`, `frontend/`) with Postgres in Docker. Backend is Express + Prisma + Better Auth. Frontend is Vite + React + Tailwind + shadcn. Root orchestrates with npm scripts and `concurrently`. Per-user auth via Better Auth (email/password); session cookies same-origin via Vite proxy.

**Tech Stack:** TypeScript everywhere, Express 5, Prisma, Better Auth, React 19, Vite, Tailwind CSS, shadcn/ui, TanStack Query, react-hook-form + Zod, Vitest, Playwright, ESLint + Prettier.

**Reference spec:** [`docs/superpowers/specs/2026-04-29-app-scaffold-design.md`](../specs/2026-04-29-app-scaffold-design.md)

**Branch:** `feat/scaffold-app` (already created)

**Conventions for this plan:**
- All paths are relative to repo root: `/Users/jonathanbirkholz/quorum/quorum_copilot_training`.
- Commit messages use Conventional Commits (`feat:`, `chore:`, `test:`, etc.).
- Each task ends with a commit so progress is reversible.
- Where TDD applies (routes with logic, components), tests come first. Pure config files use a "create + verify" pattern.

---

## File Structure (locked in here)

After this plan is executed the repo looks like:

```
quorum_copilot_training/
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── env.ts
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── middleware/require-auth.ts
│   │   └── routes/
│   │       ├── health.ts
│   │       └── me.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/<timestamp>_init/migration.sql
│   ├── tests/health.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── eslint.config.js
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── lib/
│   │   │   ├── auth-client.ts
│   │   │   └── query-client.ts
│   │   ├── components/
│   │   │   ├── ui/{button,input,label,card,form}.tsx     # shadcn-generated
│   │   │   └── protected-route.tsx
│   │   ├── pages/
│   │   │   ├── login.tsx
│   │   │   ├── signup.tsx
│   │   │   └── home.tsx
│   │   └── styles/globals.css
│   ├── tests/login.test.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── components.json
│   └── eslint.config.js
├── e2e/
│   └── signup-to-home.spec.ts
├── scripts/
│   └── setup.mjs
├── docs/
│   ├── superpowers/
│   │   ├── specs/2026-04-29-app-scaffold-design.md   # already exists
│   │   └── plans/2026-04-29-app-scaffold.md          # this file
│   └── lessons/README.md
├── docker-compose.yml
├── playwright.config.ts
├── package.json
├── prettier.config.js
├── .env.example
├── README.md
├── .gitignore
└── .tool-versions                                     # already exists
```

---

## Phase 1: Repo foundation (Postgres up, root scripts working)

### Task 1: Root package.json with orchestration scripts

**Files:**
- Create: `package.json`
- Create: `prettier.config.js`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "quorum-copilot-training",
  "version": "0.1.0",
  "private": true,
  "description": "Copilot/Claude Code training playground (contact-book domain)",
  "scripts": {
    "db:up": "docker compose up -d postgres",
    "db:down": "docker compose down",
    "db:reset": "docker compose down -v && docker compose up -d postgres",
    "dev": "concurrently -n be,fe -c blue,green \"npm --prefix backend run dev\" \"npm --prefix frontend run dev\"",
    "test": "npm --prefix backend test && npm --prefix frontend test",
    "lint": "npm --prefix backend run lint && npm --prefix frontend run lint",
    "e2e": "playwright test",
    "setup": "node scripts/setup.mjs"
  },
  "devDependencies": {
    "concurrently": "^9.0.0",
    "@playwright/test": "^1.48.0",
    "prettier": "^3.3.0"
  }
}
```

- [ ] **Step 2: Create `prettier.config.js`**

```js
/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
};
```

- [ ] **Step 3: Install root deps**

Run: `npm install`
Expected: creates `node_modules/` and `package-lock.json`. No errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json prettier.config.js
git commit -m "chore: add root package.json with orchestration scripts"
```

---

### Task 2: Docker compose for Postgres + .env.example + gitignore

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16
    container_name: copilot_training_postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: copilot
      POSTGRES_PASSWORD: copilot
      POSTGRES_DB: copilot_training
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U copilot -d copilot_training"]
      interval: 2s
      timeout: 2s
      retries: 20

volumes:
  postgres_data:
```

- [ ] **Step 2: Create root `.env.example`**

```env
# Postgres (matches docker-compose.yml)
POSTGRES_USER=copilot
POSTGRES_PASSWORD=copilot
POSTGRES_DB=copilot_training
```

- [ ] **Step 3: Update `.gitignore`**

Replace the file contents with:

```
node_modules/
dist/
build/
.next/
.vite/

# env files
.env
.env.*
!.env.example

# logs
*.log
npm-debug.log*

# OS
.DS_Store

# editor
.serena/

# test artifacts
playwright-report/
test-results/
coverage/
```

- [ ] **Step 4: Bring Postgres up and verify**

Run: `npm run db:up`
Expected: `Container copilot_training_postgres Started`. No errors.

Run: `docker compose ps`
Expected: `postgres` service shows status `running` and health `healthy` (after a few seconds).

> Note: a follow-up cleanup commit later in the branch added `*.tsbuildinfo` plus `frontend/vite*.config.{d.ts,js}` to `.gitignore` because Vite's composite tsconfig emits land next to source files. Future re-runs of this plan should bake those entries into Step 3's gitignore from the start.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example .gitignore
git commit -m "chore: add docker-compose for postgres and env example"
```

---

### Task 3: Docs scaffolding (lessons placeholder, README skeleton)

**Files:**
- Create: `docs/lessons/README.md`
- Create: `README.md`

- [ ] **Step 1: Create `docs/lessons/README.md`**

```markdown
# Lesson Plans

Lesson plans for Copilot / Claude Code training sessions go here. Each lesson should describe:

- Setup (e.g., "apply this patch to introduce a bug", or "start from clean main")
- Goal (what skill the trainee is practicing)
- Walkthrough (suggested prompts and expected AI behavior)
- Wrap-up (what to discuss after)

The first lesson plans will be added in subsequent PRs once the contact-book features land.
```

- [ ] **Step 2: Create root `README.md` (skeleton — final pass in Task 21)**

```markdown
# Quorum Copilot Training

A small full-stack TypeScript app — a contact / address book — used as a playground for Copilot and Claude Code training. The app is deliberately kept simple so trainees can practice AI-assisted refactors, fixes, and feature additions on top of a working baseline.

## Status

Scaffolding only. The contact-book domain ships in a follow-up PR.

## Prerequisites

- Node 24.15 (see `.tool-versions` — works with `asdf`, `mise`, `fnm`, etc.)
- Docker (for Postgres)

## Quickstart

(Filled in after implementation lands.)

## Project layout

(Filled in after implementation lands.)
```

- [ ] **Step 3: Commit**

```bash
git add docs/lessons/README.md README.md
git commit -m "docs: add lessons placeholder and README skeleton"
```

---

## Phase 2: Backend foundation

### Task 4: Backend package.json + TS + Express skeleton

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/index.ts`
- Create: `backend/.env.example`

- [ ] **Step 1: Create `backend/package.json`**

```json
{
  "name": "@copilot-training/backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx --watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.20.0",
    "better-auth": "^1.0.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "express": "^5.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/supertest": "^6.0.2",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "prisma": "^5.20.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*", "prisma/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Create minimal `backend/src/index.ts`**

```ts
import express from "express";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`backend listening on http://localhost:${PORT}`);
});
```

- [ ] **Step 4: Create `backend/.env.example`**

```env
DATABASE_URL="postgresql://copilot:copilot@localhost:5432/copilot_training"
BETTER_AUTH_SECRET="change-me-to-a-long-random-string"
BETTER_AUTH_URL="http://localhost:3000"
PORT=3000
FRONTEND_ORIGIN="http://localhost:5173"
```

- [ ] **Step 5: Install backend deps**

Run: `npm --prefix backend install`
Expected: success, `backend/node_modules` and `backend/package-lock.json` created.

- [ ] **Step 6: Smoke-test the dev server**

Run (in one terminal): `npm --prefix backend run dev`
Run (in another terminal): `curl -s http://localhost:3000/health`
Expected: `{"status":"ok"}`.
Stop the dev server with Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/tsconfig.json backend/src/index.ts backend/.env.example
git commit -m "feat(backend): scaffold express + ts entrypoint"
```

---

### Task 5: Prisma init + Better Auth schema + initial migration

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/.env` (gitignored — copy from `.env.example`)
- Generated: `backend/prisma/migrations/<timestamp>_init/migration.sql`

- [ ] **Step 1: Copy `.env.example` → `.env`**

Run: `cp backend/.env.example backend/.env`

Edit `backend/.env` and replace `BETTER_AUTH_SECRET` with a real random string. A quick generator:

Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Paste the output as the value of `BETTER_AUTH_SECRET` in `backend/.env`.

- [ ] **Step 2: Create `backend/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions Session[]
  accounts Account[]
}

model Session {
  id        String   @id
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Account {
  id                    String    @id
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  idToken               String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

- [ ] **Step 3: Run the initial migration**

Ensure Postgres is up: `npm run db:up`

Run: `npm --prefix backend run prisma:migrate -- --name init`
Expected: Prisma generates `backend/prisma/migrations/<timestamp>_init/migration.sql`, applies it, and prints "Your database is now in sync with your schema." Also generates Prisma Client into `node_modules/.prisma/client`.

- [ ] **Step 4: Verify schema in DB**

Run: `docker exec -it copilot_training_postgres psql -U copilot -d copilot_training -c "\dt"`
Expected output includes tables: `User`, `Session`, `Account`, `Verification`, `_prisma_migrations`.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(backend): add prisma schema with better-auth tables and initial migration"
```

> Note: `backend/.env` is gitignored and stays local.

---

### Task 6: Env loader + Prisma client singleton

**Files:**
- Create: `backend/src/env.ts`
- Create: `backend/src/prisma.ts`

- [ ] **Step 1: Create `backend/src/env.ts`**

```ts
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

- [ ] **Step 2: Create `backend/src/prisma.ts`**

```ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/env.ts backend/src/prisma.ts
git commit -m "feat(backend): add env loader and prisma client singleton"
```

---

### Task 7: Better Auth configuration

**Files:**
- Create: `backend/src/auth.ts`

- [ ] **Step 1: Create `backend/src/auth.ts`**

```ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
import { env } from "./env.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
  },
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.FRONTEND_ORIGIN],
  advanced: {
    cookies: {
      session_token: {
        attributes: { sameSite: "lax", httpOnly: true, secure: false },
      },
    },
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/auth.ts
git commit -m "feat(backend): configure better-auth with prisma adapter and email/password"
```

---

## Phase 3: Backend routes (with TDD)

### Task 8: Vitest config + supertest harness

**Files:**
- Create: `backend/vitest.config.ts`
- Create: `backend/tests/setup.ts`

- [ ] **Step 1: Create `backend/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
```

- [ ] **Step 2: Create `backend/tests/setup.ts`**

```ts
// Loads test-time defaults so tests don't depend on a real .env file.
process.env.DATABASE_URL ??= "postgresql://copilot:copilot@localhost:5432/copilot_training";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.NODE_ENV = "test";
```

- [ ] **Step 3: Verify Vitest can boot (no tests yet → 0 tests is OK)**

Run: `npm --prefix backend test`
Expected: "No test files found" or similar — Vitest exits cleanly.

- [ ] **Step 4: Commit**

```bash
git add backend/vitest.config.ts backend/tests/setup.ts
git commit -m "test(backend): add vitest config and test env setup"
```

---

### Task 9: Refactor server into `createApp` + add `/health` test (TDD)

The current `index.ts` has the listen call hard-wired. To test routes with supertest, split the express app from the listen call.

**Files:**
- Create: `backend/src/app.ts`
- Modify: `backend/src/index.ts` (full rewrite)
- Create: `backend/src/routes/health.ts`
- Create: `backend/tests/health.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `backend/tests/health.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("GET /health", () => {
  it("returns status ok", async () => {
    const app = createApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npm --prefix backend test`
Expected: FAIL — "Cannot find module '../src/app.js'" (the file doesn't exist yet).

- [ ] **Step 3: Create `backend/src/routes/health.ts`**

```ts
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok" });
});
```

- [ ] **Step 4: Create `backend/src/app.ts`**

```ts
import express, { type Express } from "express";
import { healthRouter } from "./routes/health.js";

export function createApp(): Express {
  const app = express();
  app.use("/health", healthRouter);
  return app;
}
```

- [ ] **Step 5: Rewrite `backend/src/index.ts`**

```ts
import { createApp } from "./app.js";
import { env } from "./env.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`backend listening on http://localhost:${env.PORT}`);
});
```

- [ ] **Step 6: Run test, expect pass**

Run: `npm --prefix backend test`
Expected: PASS — 1 test passes.

- [ ] **Step 7: Commit**

```bash
git add backend/src/app.ts backend/src/index.ts backend/src/routes/health.ts backend/tests/health.test.ts
git commit -m "feat(backend): extract createApp and add tested /health route"
```

---

### Task 10: Mount Better Auth handler + CORS + cookie-parser

**Files:**
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Update `backend/src/app.ts` to mount auth, CORS, and cookie parsing**

Replace the contents with:

```ts
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { env } from "./env.js";
import { healthRouter } from "./routes/health.js";

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());

  // Better Auth must be mounted BEFORE express.json() so it can read raw bodies.
  // Express 5 requires a named wildcard parameter — bare `*` throws at boot.
  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json());

  app.use("/health", healthRouter);

  return app;
}
```

- [ ] **Step 2: Run tests — health should still pass**

Run: `npm --prefix backend test`
Expected: PASS — 1 test passes (the new auth wiring doesn't break health).

- [ ] **Step 3: Manual smoke: signup endpoint reachable**

Run (in one terminal): `npm --prefix backend run dev`
Run (in another terminal):

```bash
curl -i -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"password123","name":"Smoke Test"}'
```

Expected: HTTP 200 with a JSON response containing a `user` object and a `Set-Cookie` header for the session. (If you get an error, check `backend/.env` is set up.)

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add backend/src/app.ts
git commit -m "feat(backend): mount better-auth handler, cors, and cookie-parser"
```

---

### Task 11: `require-auth` middleware + `/api/me` route (TDD)

**Files:**
- Create: `backend/src/middleware/require-auth.ts`
- Create: `backend/src/routes/me.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/tests/me.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `backend/tests/me.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("GET /api/me", () => {
  it("returns 401 when no session cookie is present", async () => {
    const app = createApp();
    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "unauthenticated" });
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npm --prefix backend test`
Expected: FAIL — `/api/me` returns 404 (route doesn't exist).

- [ ] **Step 3: Create `backend/src/middleware/require-auth.ts`**

```ts
import type { NextFunction, Request, Response } from "express";
import { auth } from "../auth.js";

export interface AuthedRequest extends Request {
  user?: { id: string; email: string; name: string };
  sessionId?: string;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });

  if (!session?.user) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  req.user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
  req.sessionId = session.session.id;
  next();
}
```

- [ ] **Step 4: Create `backend/src/routes/me.ts`**

```ts
import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/require-auth.js";

export const meRouter = Router();

meRouter.get("/", requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});
```

- [ ] **Step 5: Mount the router in `backend/src/app.ts`**

Add the import at the top:

```ts
import { meRouter } from "./routes/me.js";
```

Add the mount line after the existing `app.use("/health", healthRouter);` line:

```ts
  app.use("/api/me", meRouter);
```

- [ ] **Step 6: Run test, expect pass**

Run: `npm --prefix backend test`
Expected: PASS — both tests pass (health + me unauthenticated).

- [ ] **Step 7: Commit**

```bash
git add backend/src/middleware/require-auth.ts backend/src/routes/me.ts backend/src/app.ts backend/tests/me.test.ts
git commit -m "feat(backend): add requireAuth middleware and /api/me route"
```

---

### Task 12: Backend seed script

**Files:**
- Create: `backend/prisma/seed.ts`

- [ ] **Step 1: Create `backend/prisma/seed.ts`**

```ts
import "dotenv/config";
import { auth } from "../src/auth.js";
import { prisma } from "../src/prisma.js";

const DEMO_USERS = [
  { email: "alice@example.com", password: "password123", name: "Alice Demo" },
  { email: "bob@example.com", password: "password123", name: "Bob Demo" },
];

async function main() {
  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`skip: ${u.email} already exists`);
      continue;
    }
    await auth.api.signUpEmail({
      body: { email: u.email, password: u.password, name: u.name },
    });
    console.log(`created: ${u.email}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Add `dotenv` dependency (the seed script reads `backend/.env`)**

Run: `npm --prefix backend install dotenv`
Expected: `dotenv` added to `backend/package.json` dependencies.

- [ ] **Step 3: Run the seed**

Run: `npm --prefix backend run db:seed`
Expected: prints `created: alice@example.com` and `created: bob@example.com`.

- [ ] **Step 4: Run again — should be idempotent**

Run: `npm --prefix backend run db:seed`
Expected: prints `skip: alice@example.com already exists` and `skip: bob@example.com already exists`.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/seed.ts backend/package.json backend/package-lock.json
git commit -m "feat(backend): add idempotent demo-user seed script"
```

---

### Task 13: Backend ESLint flat config

**Files:**
- Create: `backend/eslint.config.js`

- [ ] **Step 1: Create `backend/eslint.config.js`**

```js
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "prisma/migrations/**"],
  },
];
```

- [ ] **Step 2: Run lint**

Run: `npm --prefix backend run lint`
Expected: clean exit (0 errors).

- [ ] **Step 3: Commit**

```bash
git add backend/eslint.config.js
git commit -m "chore(backend): add eslint flat config"
```

---

## Phase 4: Frontend foundation

### Task 14: Frontend package.json + Vite + TS + base files

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/styles/globals.css`

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "@copilot-training/frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint ."
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.0",
    "@tanstack/react-query": "^5.59.0",
    "better-auth": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.453.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.53.0",
    "react-router-dom": "^6.27.0",
    "tailwind-merge": "^2.5.4",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.0.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.0",
    "typescript-eslint": "^8.0.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `frontend/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create `frontend/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        // Forward cookies for Better Auth.
        cookieDomainRewrite: "localhost",
      },
    },
  },
});
```

- [ ] **Step 5: Create `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Copilot Training</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `frontend/src/styles/globals.css`** (placeholder; Tailwind directives added in next task)

```css
:root {
  font-family: system-ui, sans-serif;
}
```

- [ ] **Step 7: Create `frontend/src/App.tsx`** (placeholder)

```tsx
export default function App() {
  return <div className="p-8">Loading…</div>;
}
```

- [ ] **Step 8: Create `frontend/src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 9: Install + smoke**

Run: `npm --prefix frontend install`
Expected: success.

Run: `npm --prefix frontend run dev`
Visit `http://localhost:5173` in a browser. Expected: page shows "Loading…".
Stop the dev server.

- [ ] **Step 10: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.ts frontend/index.html frontend/src
git commit -m "feat(frontend): scaffold vite + react + ts entrypoint"
```

---

### Task 15: Tailwind + shadcn init + components

**Files:**
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/components.json`
- Modify: `frontend/src/styles/globals.css`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/label.tsx`
- Create: `frontend/src/components/ui/card.tsx`
- Create: `frontend/src/components/ui/form.tsx`

> Note on shadcn: rather than running `npx shadcn@latest init` (which requires interactive prompts), this task writes the equivalent files directly. After this lands, future component additions can use the CLI: `npx shadcn@latest add <component>`.

- [ ] **Step 1: Create `frontend/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 2: Create `frontend/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
```

- [ ] **Step 3: Create `frontend/components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

- [ ] **Step 4: Replace `frontend/src/styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 47.4% 11.2%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 100% 50%;
    --destructive-foreground: 210 40% 98%;
    --ring: 215 20.2% 65.1%;
    --radius: 0.5rem;
  }

  * {
    border-color: hsl(var(--border));
  }
  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}
```

- [ ] **Step 5: Create `frontend/src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: Create `frontend/src/components/ui/button.tsx`**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  ),
);
Button.displayName = "Button";
```

- [ ] **Step 7: Create `frontend/src/components/ui/input.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";
```

- [ ] **Step 8: Create `frontend/src/components/ui/label.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-medium leading-none", className)}
    {...props}
  />
));
Label.displayName = "Label";
```

- [ ] **Step 9: Create `frontend/src/components/ui/card.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-2xl font-semibold leading-none", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";
```

- [ ] **Step 10: Create `frontend/src/components/ui/form.tsx` (exact)**

A small form helper layered on react-hook-form. Wires per-field IDs through a context so `FormLabel.htmlFor` matches `Input.id`, which is required for accessible labelling and for testing-library's `getByLabelText` to find inputs.

```tsx
import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "./label";

export const Form = FormProvider;

type FormFieldContextValue = { id: string; name: string };
const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

function useFormField() {
  const ctx = React.useContext(FormFieldContext);
  if (!ctx) throw new Error("useFormField must be used inside a FormField");
  return ctx;
}

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  const id = React.useId();
  return (
    <FormFieldContext.Provider value={{ id, name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  ),
);
FormItem.displayName = "FormItem";

export const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ ...props }, ref) => {
  const { id } = useFormField();
  return <Label ref={ref} htmlFor={id} {...props} />;
});
FormLabel.displayName = "FormLabel";

export const FormControl = React.forwardRef<
  HTMLElement,
  { children: React.ReactElement<Record<string, unknown>> }
>(({ children }, _ref) => {
  const { id } = useFormField();
  return React.cloneElement(children, { id });
});
FormControl.displayName = "FormControl";

export function FormMessage({ name }: { name?: string }) {
  const ctx = React.useContext(FormFieldContext);
  const fieldName = name ?? ctx?.name;
  const {
    formState: { errors },
  } = useFormContext();
  if (!fieldName) return null;
  const error = fieldName.split(".").reduce<unknown>(
    (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
    errors,
  );
  if (!error || typeof error !== "object" || !("message" in error)) return null;
  return <p className="text-sm text-destructive">{(error as { message?: string }).message}</p>;
}
```

- [ ] **Step 11: Smoke-test build**

Run: `npm --prefix frontend run build`
Expected: build succeeds, `frontend/dist/` is created.

- [ ] **Step 12: Commit**

```bash
git add frontend/tailwind.config.ts frontend/postcss.config.js frontend/components.json frontend/src/styles/globals.css frontend/src/lib frontend/src/components/ui
git commit -m "feat(frontend): add tailwind config and shadcn ui primitives"
```

---

### Task 16: Better Auth React client + TanStack Query

**Files:**
- Create: `frontend/src/lib/auth-client.ts`
- Create: `frontend/src/lib/query-client.ts`

- [ ] **Step 1: Create `frontend/src/lib/auth-client.ts`**

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Same-origin in dev thanks to Vite's /api proxy.
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

- [ ] **Step 2: Create `frontend/src/lib/query-client.ts`**

```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/auth-client.ts frontend/src/lib/query-client.ts
git commit -m "feat(frontend): add better-auth react client and tanstack query client"
```

---

### Task 17: Router + protected route + pages

**Files:**
- Create: `frontend/src/components/protected-route.tsx`
- Create: `frontend/src/pages/login.tsx`
- Create: `frontend/src/pages/signup.tsx`
- Create: `frontend/src/pages/home.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Create `frontend/src/components/protected-route.tsx`**

```tsx
import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/lib/auth-client";

export function ProtectedRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div className="p-8">Loading…</div>;
  if (!session?.user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
```

- [ ] **Step 2: Create `frontend/src/pages/login.tsx`**

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    const { error } = await signIn.email({ email: values.email, password: values.password });
    if (error) {
      form.setError("password", { message: error.message ?? "Sign in failed" });
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                Log in
              </Button>
              <p className="text-sm text-muted-foreground">
                No account?{" "}
                <Link className="underline" to="/signup">
                  Sign up
                </Link>
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/pages/signup.tsx`**

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    const { error } = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    });
    if (error) {
      form.setError("email", { message: error.message ?? "Sign up failed" });
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                Sign up
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link className="underline" to="/login">
                  Log in
                </Link>
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/pages/home.tsx`**

```tsx
import { useNavigate } from "react-router-dom";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Welcome, {session?.user?.name ?? "friend"}</h1>
      <p className="text-sm text-muted-foreground">
        This is a placeholder home page. Contact features ship in the next PR.
      </p>
      <Button variant="outline" onClick={handleLogout}>
        Log out
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Replace `frontend/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/protected-route";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import HomePage from "@/pages/home";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Replace `frontend/src/main.tsx` to wrap in QueryClientProvider**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { queryClient } from "@/lib/query-client";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 7: Smoke-test the full flow manually**

Make sure Postgres is up (`npm run db:up`) and the backend is running (`npm --prefix backend run dev` in another terminal). Then:

Run: `npm --prefix frontend run dev`

In a browser:
1. Visit `http://localhost:5173/` → redirected to `/login`.
2. Click "Sign up" → fill in name `Test`, email `manual@example.com`, password `password123` → submit.
3. Expect redirect to `/` showing "Welcome, Test".
4. Click "Log out" → redirected to `/login`.
5. Log in with `alice@example.com` / `password123` (seeded earlier) → expect "Welcome, Alice Demo".

Stop both dev servers.

- [ ] **Step 8: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): add auth pages, protected route, and router"
```

---

### Task 18: Frontend ESLint config + Vitest config + login render test

**Files:**
- Create: `frontend/eslint.config.js`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/tests/setup.ts`
- Create: `frontend/tests/login.test.tsx`

- [ ] **Step 1: Create `frontend/eslint.config.js`**

```js
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: { ecmaVersion: 2022, sourceType: "module" },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  },
);
```

- [ ] **Step 2: Create `frontend/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
```

- [ ] **Step 3: Create `frontend/tests/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Write the failing test**

Create `frontend/tests/login.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../src/pages/login";

describe("LoginPage", () => {
  it("renders email and password inputs and a submit button", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run tests, expect pass**

Run: `npm --prefix frontend test`
Expected: PASS — 1 test passes.

- [ ] **Step 6: Run lint**

Run: `npm --prefix frontend run lint`
Expected: clean exit (0 errors). If errors appear, fix them inline (most common: unused imports).

- [ ] **Step 7: Commit**

```bash
git add frontend/eslint.config.js frontend/vitest.config.ts frontend/tests
git commit -m "test(frontend): add eslint config, vitest config, and login render smoke test"
```

---

## Phase 5: E2E + setup script + final wiring

### Task 19: Playwright config + signup-to-home smoke E2E

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/signup-to-home.spec.ts`

- [ ] **Step 1: Install Playwright browsers**

Run: `npx playwright install chromium`
Expected: downloads Chromium. Done.

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

const FRONTEND = "http://localhost:5173";
const BACKEND = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: FRONTEND,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: [
    {
      command: "npm --prefix backend run dev",
      url: `${BACKEND}/health`,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm --prefix frontend run dev",
      url: FRONTEND,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
```

- [ ] **Step 3: Create `e2e/signup-to-home.spec.ts`**

The test creates a unique user each run so it can be re-run against a non-clean DB.

```ts
import { test, expect } from "@playwright/test";

test("signup → land on home with welcome", async ({ page }) => {
  const unique = Date.now();
  const email = `e2e-${unique}@example.com`;

  await page.goto("/signup");
  await page.getByLabel(/name/i).fill(`E2E User ${unique}`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill("password123");
  await page.getByRole("button", { name: /sign up/i }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading")).toContainText(`Welcome, E2E User ${unique}`);
});
```

- [ ] **Step 4: Run E2E**

Make sure Postgres is up: `npm run db:up`

Run: `npm run e2e`
Expected: Playwright boots both dev servers (or reuses running ones), runs the spec, and prints `1 passed`. The test creates a one-off user in the DB; that's fine.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e
git commit -m "test(e2e): add playwright config and signup-to-home smoke spec"
```

---

### Task 20: Root setup script (`scripts/setup.mjs`)

**Files:**
- Create: `scripts/setup.mjs`

- [ ] **Step 1: Create `scripts/setup.mjs`**

```js
#!/usr/bin/env node
// One-shot bootstrap: installs deps in root/backend/frontend, generates Prisma client,
// applies migrations, and seeds demo users. Idempotent.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

async function step(label, fn) {
  console.log(`\n▶ ${label}`);
  await fn();
  console.log(`✔ ${label}`);
}

async function main() {
  if (!existsSync(path.join(ROOT, "backend", ".env"))) {
    console.log("Creating backend/.env from backend/.env.example");
    await run("cp", [path.join(ROOT, "backend", ".env.example"), path.join(ROOT, "backend", ".env")]);
    console.warn("⚠ Edit backend/.env and replace BETTER_AUTH_SECRET with a real random value before running the app in dev.");
  }

  await step("Install root deps", () => run("npm", ["install"], { cwd: ROOT }));
  await step("Install backend deps", () => run("npm", ["install"], { cwd: path.join(ROOT, "backend") }));
  await step("Install frontend deps", () => run("npm", ["install"], { cwd: path.join(ROOT, "frontend") }));
  await step("Generate Prisma client", () =>
    run("npm", ["run", "prisma:generate"], { cwd: path.join(ROOT, "backend") }),
  );
  await step("Apply migrations", () =>
    run("npm", ["run", "prisma:migrate"], { cwd: path.join(ROOT, "backend") }),
  );
  await step("Seed demo users", () =>
    run("npm", ["run", "db:seed"], { cwd: path.join(ROOT, "backend") }),
  );

  console.log("\nSetup complete. Next: `npm run dev`");
}

main().catch((err) => {
  console.error("\n✖ Setup failed:", err.message);
  console.error("Hint: ensure Postgres is running (`npm run db:up`) before re-running setup.");
  process.exit(1);
});
```

- [ ] **Step 2: Verify the script runs end-to-end**

Run: `npm run setup`
Expected: each step prints ▶ then ✔. Final line: "Setup complete. Next: `npm run dev`".

If migrations and seed already ran earlier, this should still succeed (Prisma reports "No pending migrations", seed prints "skip: ... already exists").

- [ ] **Step 3: Commit**

```bash
git add scripts/setup.mjs
git commit -m "feat: add root setup script for one-shot bootstrap"
```

---

### Task 21: Final README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` with the final version**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: finalize README with setup, run, and test instructions"
```

---

## Phase 6: Verification

### Task 22: End-to-end verification on a fresh database

This is the acceptance gate. Walk through it as if a new trainee just cloned the repo.

- [ ] **Step 1: Reset state**

Run: `npm run db:reset`
Expected: Postgres volume is wiped and the container restarts.

- [ ] **Step 2: Run setup**

Run: `npm run setup`
Expected: all steps succeed. Demo users are seeded.

- [ ] **Step 3: Start the app**

Run (in one terminal): `npm run dev`
Expected: backend logs `backend listening on http://localhost:3000`. Frontend logs `Local: http://localhost:5173/`.

- [ ] **Step 4: Browser flow**

In a browser:
1. Visit `http://localhost:5173/` → redirects to `/login`.
2. Log in with `alice@example.com` / `password123` → see "Welcome, Alice Demo".
3. Click "Log out" → back at `/login`.
4. Click "Sign up" → register a new user → see the welcome page for that user.
5. Stop the dev server (Ctrl-C).

- [ ] **Step 5: Tests + lint + E2E**

Run: `npm test`
Expected: all backend + frontend tests pass.

Run: `npm run lint`
Expected: clean.

Run: `npm run e2e`
Expected: `1 passed`.

- [ ] **Step 6: Confirm acceptance criteria**

Tick off each item from the spec's Acceptance Criteria section:

- [ ] Fresh clone → `db:up` → `setup` → `dev` flow works in ~5 minutes.
- [ ] `npm run setup` is idempotent.
- [ ] `npm run db:up && npm run dev` brings up both services with hot reload.
- [ ] Seeded demo users can log in immediately after `setup`.
- [ ] Browser flow (signup → home → logout → login) works.
- [ ] `npm test` passes.
- [ ] `npm run e2e` passes.
- [ ] `npm run lint` is clean.
- [ ] `docs/lessons/` exists.
- [ ] Branch `feat/scaffold-app` is the working branch.

- [ ] **Step 7: Open the PR (optional, ask user first)**

Don't push or open a PR without the user's explicit say-so. When they ask, push the branch and open the PR with a summary referencing the spec.

---

## Done

After Task 22, the scaffolding is complete and ready for review. The next PR will add the Contact data model and CRUD UI on top of this foundation.
