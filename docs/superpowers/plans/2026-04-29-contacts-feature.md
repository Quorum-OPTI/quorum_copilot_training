# Contacts Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a per-user contact / address book on top of the existing scaffold — five REST endpoints, four screens (list, detail, edit, create), Zod-validated on both sides, scoped to the authenticated user.

**Architecture:** New `Contact` Prisma model with a `userId` foreign key cascading from `User`. Express router mounted at `/api/contacts` behind the existing `requireAuth` middleware. React pages under `frontend/src/pages/contacts/`, sharing one `ContactForm` component for create and edit. Vitest for unit tests on both sides; Playwright for one happy-path E2E plus one cross-user isolation E2E. All cross-user `:id` accesses return `404` (not `403`) to avoid leaking record existence.

**Tech Stack:** Express 5, Prisma 5, Better Auth, Zod, React 19, react-router 6, react-hook-form, shadcn/ui (Form/Card/Button/Input only), Vitest + Testing Library, Playwright.

**Spec:** [`docs/superpowers/specs/2026-04-29-contacts-feature-design.md`](../specs/2026-04-29-contacts-feature-design.md)

**Deviations from spec:**
- Delete confirmation uses `window.confirm()` rather than a shadcn `AlertDialog` component, because `AlertDialog` is not in the scaffold and adding it for one button is YAGNI. Swapping it for `AlertDialog` is one of the staged future tickets.

**Branch strategy:** Branch from `docs/lesson-outlines` (so the spec travels with the work). Final PR target is `main`.

---

## File Structure

### Backend — created or modified

| Path | Purpose |
|---|---|
| `backend/prisma/schema.prisma` | Modify: add `Contact` model + back-relation on `User` |
| `backend/prisma/migrations/<ts>_add_contacts/migration.sql` | Created by `prisma migrate dev` |
| `backend/src/lib/contact-schemas.ts` | New: Zod `createContactSchema`, `updateContactSchema` |
| `backend/src/routes/contacts.ts` | New: Express router with the 5 endpoints |
| `backend/src/app.ts` | Modify: mount `contactsRouter` at `/api/contacts` |
| `backend/tests/helpers/auth.ts` | New: sign up a unique test user, return its cookie + cleanup fn |
| `backend/tests/contacts.test.ts` | New: covers all 5 endpoints incl. cross-user 404 |

### Frontend — created or modified

| Path | Purpose |
|---|---|
| `frontend/src/lib/contact-schemas.ts` | New: Zod schemas duplicated from backend |
| `frontend/src/lib/api/contacts.ts` | New: typed fetch wrappers (5 functions) |
| `frontend/src/pages/contacts/ContactForm.tsx` | New: shared form, takes `initialValues` + `onSubmit` |
| `frontend/src/pages/contacts/ContactsList.tsx` | New: table + search + empty state |
| `frontend/src/pages/contacts/ContactDetail.tsx` | New: read-only view + Edit/Delete buttons |
| `frontend/src/pages/contacts/ContactNew.tsx` | New: wraps `ContactForm` with create behavior |
| `frontend/src/pages/contacts/ContactEdit.tsx` | New: fetches then wraps `ContactForm` with update behavior |
| `frontend/src/App.tsx` | Modify: add 4 protected routes |
| `frontend/src/pages/home.tsx` | Modify: add a "Go to contacts" link |
| `frontend/tests/ContactForm.test.tsx` | New: required-field, email-format, submit shape |
| `frontend/tests/ContactsList.test.tsx` | New: rows render, search filters, empty state |

### E2E — created

| Path | Purpose |
|---|---|
| `e2e/contacts.spec.ts` | Happy-path CRUD spec + cross-user isolation spec |

---

## Task 0: Branch setup

**Files:** none (git only)

- [ ] **Step 1: Create the feature branch off `docs/lesson-outlines`**

```bash
git checkout docs/lesson-outlines
git pull --ff-only origin docs/lesson-outlines || true   # safe no-op if branch is local-only
git checkout -b feature/contacts
```

Expected: `Switched to a new branch 'feature/contacts'`.

- [ ] **Step 2: Verify the working tree is clean and the spec/lessons are present**

```bash
git status
ls docs/lessons/ docs/superpowers/specs/
```

Expected: clean tree; `s1_to_s2_90min.md`, `s2_to_s3_90min.md`, `2026-04-29-contacts-feature-design.md` all present.

---

## Task 1: Add the `Contact` Prisma model + migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<ts>_add_contacts/migration.sql` (auto-generated)

- [ ] **Step 1: Modify `backend/prisma/schema.prisma`**

Append the `Contact` model and add the back-relation to `User`:

```prisma
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
  contacts Contact[]
}
```

Append at the bottom of the file (after the existing `Verification` model):

```prisma
model Contact {
  id        String   @id @default(cuid())
  userId    String
  name      String
  email     String?
  phone     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

- [ ] **Step 2: Generate the migration**

Make sure Postgres is up first:

```bash
npm run db:up
npm --prefix backend run prisma:migrate -- --name add_contacts
```

Expected: a new directory `backend/prisma/migrations/<ts>_add_contacts/` with a `migration.sql`. The Prisma client is regenerated automatically.

- [ ] **Step 3: Verify the schema compiles and the client knows about `Contact`**

```bash
npm --prefix backend run build
```

Expected: clean tsc build (no errors).

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(contacts): add Contact prisma model and migration"
```

---

## Task 2: Add backend Zod schemas

**Files:**
- Create: `backend/src/lib/contact-schemas.ts`
- Create: `backend/tests/contact-schemas.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/contact-schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createContactSchema, updateContactSchema } from "../src/lib/contact-schemas.js";

describe("createContactSchema", () => {
  it("accepts the minimum valid payload (name only)", () => {
    expect(createContactSchema.safeParse({ name: "Alice" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const r = createContactSchema.safeParse({ name: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const r = createContactSchema.safeParse({ name: "Alice", email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("treats email and phone as optional", () => {
    const r = createContactSchema.safeParse({ name: "Alice", email: undefined, phone: undefined });
    expect(r.success).toBe(true);
  });

  it("accepts an empty-string email/phone as 'not provided'", () => {
    // Frontend forms commonly submit "" rather than undefined for empty optional fields.
    // The schema should accept that and treat it as absent.
    const r = createContactSchema.safeParse({ name: "Alice", email: "", phone: "" });
    expect(r.success).toBe(true);
  });
});

describe("updateContactSchema", () => {
  it("accepts a partial update with only one field", () => {
    expect(updateContactSchema.safeParse({ phone: "555-1212" }).success).toBe(true);
  });

  it("accepts an empty object (no-op update)", () => {
    expect(updateContactSchema.safeParse({}).success).toBe(true);
  });

  it("rejects an empty name when name is provided", () => {
    expect(updateContactSchema.safeParse({ name: "" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm --prefix backend test -- contact-schemas
```

Expected: FAIL — module `../src/lib/contact-schemas.js` not found.

- [ ] **Step 3: Implement the schemas**

Create `backend/src/lib/contact-schemas.ts`:

```ts
import { z } from "zod";

// Optional string that accepts "" as "not provided" — forms often submit "" for empty optional fields.
const optionalString = z
  .string()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalEmail = z
  .string()
  .transform((v) => (v === "" ? undefined : v))
  .optional()
  .refine((v) => v === undefined || z.string().email().safeParse(v).success, {
    message: "Must be a valid email",
  });

export const createContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: optionalEmail,
  phone: optionalString,
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm --prefix backend test -- contact-schemas
```

Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/contact-schemas.ts backend/tests/contact-schemas.test.ts
git commit -m "feat(contacts): add Zod schemas for create and update"
```

---

## Task 3: Add the backend test auth helper

**Files:**
- Create: `backend/tests/helpers/auth.ts`

This helper signs up a unique-email user via the Better Auth API and returns the session cookie plus a cleanup function that hard-deletes the user (cascade-deletes the user's sessions and contacts). Tests use this to make authenticated requests.

- [ ] **Step 1: Write the helper**

Create `backend/tests/helpers/auth.ts`:

```ts
import request from "supertest";
import type { Express } from "express";
import { prisma } from "../../src/prisma.js";

export interface TestUser {
  userId: string;
  email: string;
  cookie: string;
  cleanup: () => Promise<void>;
}

/**
 * Sign up a unique test user via the auth API and return its session cookie.
 * Caller is responsible for invoking `cleanup()` (typically in afterEach).
 */
export async function createTestUser(app: Express, label = "user"): Promise<TestUser> {
  const unique = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `${unique}@test.local`;
  const password = "password123";

  const res = await request(app)
    .post("/api/auth/sign-up/email")
    .send({ email, password, name: unique });

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`sign-up failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const setCookie = res.headers["set-cookie"];
  const cookies: string[] = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const cookie = cookies.map((c: string) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("sign-up returned no Set-Cookie header");

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });

  return {
    userId: user.id,
    email,
    cookie,
    cleanup: async () => {
      await prisma.user.deleteMany({ where: { id: user.id } });
    },
  };
}
```

- [ ] **Step 2: Smoke-test the helper by writing a tiny test**

Append to `backend/tests/contact-schemas.test.ts` (or create `backend/tests/helpers/auth.test.ts` — either is fine; the helper file gets exercised heavily by Task 4 onwards):

```ts
// (skipped — the helper is exercised by tests/contacts.test.ts in Task 4)
```

No new test file needed yet.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/helpers/auth.ts
git commit -m "test(contacts): add auth helper for authenticated supertest requests"
```

---

## Task 4: Implement `GET /api/contacts` (list)

**Files:**
- Create: `backend/src/routes/contacts.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/tests/contacts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/contacts.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { createTestUser, type TestUser } from "./helpers/auth.js";

const app = createApp();

describe("GET /api/contacts", () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeEach(async () => {
    alice = await createTestUser(app, "alice");
    bob = await createTestUser(app, "bob");
  });

  afterEach(async () => {
    await alice.cleanup();
    await bob.cleanup();
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).get("/api/contacts");
    expect(res.status).toBe(401);
  });

  it("returns the current user's contacts only, sorted by name asc", async () => {
    await prisma.contact.create({ data: { userId: alice.userId, name: "Zoe" } });
    await prisma.contact.create({ data: { userId: alice.userId, name: "Anna" } });
    await prisma.contact.create({ data: { userId: bob.userId, name: "Bob's friend" } });

    const res = await request(app).get("/api/contacts").set("Cookie", alice.cookie);

    expect(res.status).toBe(200);
    expect(res.body.contacts).toHaveLength(2);
    expect(res.body.contacts.map((c: { name: string }) => c.name)).toEqual(["Anna", "Zoe"]);
  });

  it("returns an empty array when the user has no contacts", async () => {
    const res = await request(app).get("/api/contacts").set("Cookie", alice.cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ contacts: [] });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm --prefix backend test -- contacts.test
```

Expected: FAIL — `/api/contacts` returns 404 (route doesn't exist).

- [ ] **Step 3: Create the router**

Create `backend/src/routes/contacts.ts`:

```ts
import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/require-auth.js";

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

contactsRouter.get("/", async (req: AuthedRequest, res) => {
  const contacts = await prisma.contact.findMany({
    where: { userId: req.user!.id },
    orderBy: { name: "asc" },
  });
  res.json({ contacts });
});
```

- [ ] **Step 4: Mount the router in `app.ts`**

Modify `backend/src/app.ts` — add the import and the `app.use(...)` line:

```ts
import { contactsRouter } from "./routes/contacts.js";
// ... existing imports

// Inside createApp(), after the meRouter mount:
app.use("/api/contacts", contactsRouter);
```

The full updated section reads:

```ts
app.use("/health", healthRouter);
app.use("/api/me", meRouter);
app.use("/api/contacts", contactsRouter);
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm --prefix backend test -- contacts.test
```

Expected: PASS — all 3 tests green.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/contacts.ts backend/src/app.ts backend/tests/contacts.test.ts
git commit -m "feat(contacts): GET /api/contacts lists current user's contacts"
```

---

## Task 5: Implement `POST /api/contacts` (create)

**Files:**
- Modify: `backend/src/routes/contacts.ts`
- Modify: `backend/tests/contacts.test.ts`

- [ ] **Step 1: Append failing tests**

Add a new `describe` block to `backend/tests/contacts.test.ts`:

```ts
describe("POST /api/contacts", () => {
  let alice: TestUser;
  beforeEach(async () => { alice = await createTestUser(app, "alice"); });
  afterEach(async () => { await alice.cleanup(); });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).post("/api/contacts").send({ name: "Z" });
    expect(res.status).toBe(401);
  });

  it("creates a contact owned by the current user and returns it", async () => {
    const res = await request(app)
      .post("/api/contacts")
      .set("Cookie", alice.cookie)
      .send({ name: "Charlie", email: "charlie@example.com", phone: "555" });

    expect(res.status).toBe(201);
    expect(res.body.contact).toMatchObject({
      name: "Charlie",
      email: "charlie@example.com",
      phone: "555",
      userId: alice.userId,
    });
    expect(res.body.contact.id).toBeTypeOf("string");
  });

  it("rejects a missing name with 400 and a ValidationError", async () => {
    const res = await request(app)
      .post("/api/contacts")
      .set("Cookie", alice.cookie)
      .send({ email: "x@y.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("ValidationError");
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  it("rejects a malformed email with 400", async () => {
    const res = await request(app)
      .post("/api/contacts")
      .set("Cookie", alice.cookie)
      .send({ name: "Charlie", email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("ValidationError");
  });

  it("treats an empty-string email/phone as not provided", async () => {
    const res = await request(app)
      .post("/api/contacts")
      .set("Cookie", alice.cookie)
      .send({ name: "Charlie", email: "", phone: "" });
    expect(res.status).toBe(201);
    expect(res.body.contact.email).toBeNull();
    expect(res.body.contact.phone).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm --prefix backend test -- contacts.test
```

Expected: FAIL — POST returns 404.

- [ ] **Step 3: Add the POST handler**

Append to `backend/src/routes/contacts.ts` (above the existing `export` already in place — i.e. after the GET handler):

```ts
import { createContactSchema } from "../lib/contact-schemas.js";

contactsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    return;
  }
  const contact = await prisma.contact.create({
    data: {
      userId: req.user!.id,
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
    },
  });
  res.status(201).json({ contact });
});
```

(Hoist the `import { createContactSchema } ...` line to the top of the file alongside the other imports.)

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm --prefix backend test -- contacts.test
```

Expected: PASS — all tests green (including the 3 from Task 4).

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/contacts.ts backend/tests/contacts.test.ts
git commit -m "feat(contacts): POST /api/contacts creates a contact"
```

---

## Task 6: Implement `GET /api/contacts/:id`

**Files:**
- Modify: `backend/src/routes/contacts.ts`
- Modify: `backend/tests/contacts.test.ts`

- [ ] **Step 1: Append failing tests**

Add a new `describe` block to `backend/tests/contacts.test.ts`:

```ts
describe("GET /api/contacts/:id", () => {
  let alice: TestUser;
  let bob: TestUser;
  beforeEach(async () => {
    alice = await createTestUser(app, "alice");
    bob = await createTestUser(app, "bob");
  });
  afterEach(async () => {
    await alice.cleanup();
    await bob.cleanup();
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).get("/api/contacts/some-id");
    expect(res.status).toBe(401);
  });

  it("returns the contact when owned by the current user", async () => {
    const c = await prisma.contact.create({ data: { userId: alice.userId, name: "Zoe" } });
    const res = await request(app).get(`/api/contacts/${c.id}`).set("Cookie", alice.cookie);
    expect(res.status).toBe(200);
    expect(res.body.contact.id).toBe(c.id);
  });

  it("returns 404 when the id does not exist", async () => {
    const res = await request(app).get("/api/contacts/nonexistent-id").set("Cookie", alice.cookie);
    expect(res.status).toBe(404);
  });

  it("returns 404 (not 403) when the id belongs to another user", async () => {
    const c = await prisma.contact.create({ data: { userId: bob.userId, name: "Bob's friend" } });
    const res = await request(app).get(`/api/contacts/${c.id}`).set("Cookie", alice.cookie);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm --prefix backend test -- contacts.test
```

Expected: FAIL — `/api/contacts/:id` returns 404 from express's default 404 handler, but the body shape probably doesn't match. The "owned" case returns 404 instead of 200.

- [ ] **Step 3: Add the GET-by-id handler**

Append to `backend/src/routes/contacts.ts`:

```ts
contactsRouter.get("/:id", async (req: AuthedRequest, res) => {
  const contact = await prisma.contact.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!contact) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.json({ contact });
});
```

The `findFirst` with both `id` and `userId` in the `where` is what produces the cross-user 404 — there is no separate `403` branch. Mirror this pattern in the PATCH and DELETE handlers in Tasks 7 and 8.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm --prefix backend test -- contacts.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/contacts.ts backend/tests/contacts.test.ts
git commit -m "feat(contacts): GET /api/contacts/:id with cross-user 404"
```

---

## Task 7: Implement `PATCH /api/contacts/:id`

**Files:**
- Modify: `backend/src/routes/contacts.ts`
- Modify: `backend/tests/contacts.test.ts`

- [ ] **Step 1: Append failing tests**

Add to `backend/tests/contacts.test.ts`:

```ts
describe("PATCH /api/contacts/:id", () => {
  let alice: TestUser;
  let bob: TestUser;
  beforeEach(async () => {
    alice = await createTestUser(app, "alice");
    bob = await createTestUser(app, "bob");
  });
  afterEach(async () => {
    await alice.cleanup();
    await bob.cleanup();
  });

  it("updates the named fields and leaves others alone", async () => {
    const c = await prisma.contact.create({
      data: { userId: alice.userId, name: "Zoe", email: "zoe@example.com", phone: "555" },
    });
    const res = await request(app)
      .patch(`/api/contacts/${c.id}`)
      .set("Cookie", alice.cookie)
      .send({ phone: "999" });
    expect(res.status).toBe(200);
    expect(res.body.contact).toMatchObject({ name: "Zoe", email: "zoe@example.com", phone: "999" });
  });

  it("rejects a malformed email with 400", async () => {
    const c = await prisma.contact.create({ data: { userId: alice.userId, name: "Zoe" } });
    const res = await request(app)
      .patch(`/api/contacts/${c.id}`)
      .set("Cookie", alice.cookie)
      .send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("rejects clearing name to empty string with 400", async () => {
    const c = await prisma.contact.create({ data: { userId: alice.userId, name: "Zoe" } });
    const res = await request(app)
      .patch(`/api/contacts/${c.id}`)
      .set("Cookie", alice.cookie)
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the id belongs to another user", async () => {
    const c = await prisma.contact.create({ data: { userId: bob.userId, name: "Bob's friend" } });
    const res = await request(app)
      .patch(`/api/contacts/${c.id}`)
      .set("Cookie", alice.cookie)
      .send({ name: "Hijacked" });
    expect(res.status).toBe(404);
    const fresh = await prisma.contact.findUnique({ where: { id: c.id } });
    expect(fresh?.name).toBe("Bob's friend");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm --prefix backend test -- contacts.test
```

Expected: FAIL.

- [ ] **Step 3: Add the PATCH handler**

Append to `backend/src/routes/contacts.ts`:

```ts
import { updateContactSchema } from "../lib/contact-schemas.js";

contactsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = updateContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    return;
  }
  const result = await prisma.contact.updateMany({
    where: { id: req.params.id, userId: req.user!.id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.email !== undefined && { email: parsed.data.email ?? null }),
      ...(parsed.data.phone !== undefined && { phone: parsed.data.phone ?? null }),
    },
  });
  if (result.count === 0) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const contact = await prisma.contact.findUnique({ where: { id: req.params.id } });
  res.json({ contact });
});
```

(Add `updateContactSchema` to the existing import line at the top so it merges with `createContactSchema`.)

`updateMany` with `userId` in the `where` is the trick that produces the cross-user 404 atomically — if the contact exists but isn't owned, `count` is 0 and we 404, never updating anything.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm --prefix backend test -- contacts.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/contacts.ts backend/tests/contacts.test.ts
git commit -m "feat(contacts): PATCH /api/contacts/:id with partial validation"
```

---

## Task 8: Implement `DELETE /api/contacts/:id`

**Files:**
- Modify: `backend/src/routes/contacts.ts`
- Modify: `backend/tests/contacts.test.ts`

- [ ] **Step 1: Append failing tests**

Add to `backend/tests/contacts.test.ts`:

```ts
describe("DELETE /api/contacts/:id", () => {
  let alice: TestUser;
  let bob: TestUser;
  beforeEach(async () => {
    alice = await createTestUser(app, "alice");
    bob = await createTestUser(app, "bob");
  });
  afterEach(async () => {
    await alice.cleanup();
    await bob.cleanup();
  });

  it("deletes the contact when owned", async () => {
    const c = await prisma.contact.create({ data: { userId: alice.userId, name: "Zoe" } });
    const res = await request(app).delete(`/api/contacts/${c.id}`).set("Cookie", alice.cookie);
    expect(res.status).toBe(204);
    const after = await prisma.contact.findUnique({ where: { id: c.id } });
    expect(after).toBeNull();
  });

  it("returns 404 when the id belongs to another user and does NOT delete it", async () => {
    const c = await prisma.contact.create({ data: { userId: bob.userId, name: "Bob's friend" } });
    const res = await request(app).delete(`/api/contacts/${c.id}`).set("Cookie", alice.cookie);
    expect(res.status).toBe(404);
    const after = await prisma.contact.findUnique({ where: { id: c.id } });
    expect(after).not.toBeNull();
  });

  it("returns 404 when the id does not exist", async () => {
    const res = await request(app).delete("/api/contacts/nonexistent-id").set("Cookie", alice.cookie);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm --prefix backend test -- contacts.test
```

Expected: FAIL.

- [ ] **Step 3: Add the DELETE handler**

Append to `backend/src/routes/contacts.ts`:

```ts
contactsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const result = await prisma.contact.deleteMany({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (result.count === 0) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.status(204).end();
});
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm --prefix backend test -- contacts.test
```

Expected: PASS — every backend test green.

- [ ] **Step 5: Run the full backend test suite to confirm no regressions**

```bash
npm --prefix backend test
```

Expected: PASS — all suites (`health`, `me`, `contact-schemas`, `contacts`).

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/contacts.ts backend/tests/contacts.test.ts
git commit -m "feat(contacts): DELETE /api/contacts/:id with cross-user 404"
```

---

## Task 9: Add frontend Zod schemas (duplicated)

**Files:**
- Create: `frontend/src/lib/contact-schemas.ts`

- [ ] **Step 1: Create the file**

The shape is intentionally identical to the backend schemas — these are duplicated, not shared. ("DRY them up into a `shared/` package" is one of the staged future tickets in the spec.)

Create `frontend/src/lib/contact-schemas.ts`:

```ts
import { z } from "zod";

const optionalString = z
  .string()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalEmail = z
  .string()
  .transform((v) => (v === "" ? undefined : v))
  .optional()
  .refine((v) => v === undefined || z.string().email().safeParse(v).success, {
    message: "Must be a valid email",
  });

export const createContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: optionalEmail,
  phone: optionalString,
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

// Shape returned by the API — matches backend's Contact prisma model.
export interface Contact {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npm --prefix frontend run build
```

Expected: clean build (no errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/contact-schemas.ts
git commit -m "feat(contacts): add frontend Zod schemas (duplicated from backend)"
```

---

## Task 10: Add the contacts API client

**Files:**
- Create: `frontend/src/lib/api/contacts.ts`

- [ ] **Step 1: Create the API wrapper module**

Same-origin via Vite's proxy means a relative path is enough. Cookies are sent automatically with `credentials: "include"`.

Create `frontend/src/lib/api/contacts.ts`:

```ts
import type { Contact, CreateContactInput, UpdateContactInput } from "@/lib/contact-schemas";

const BASE = "/api/contacts";

export class ApiError extends Error {
  constructor(public status: number, message: string, public issues?: unknown) {
    super(message);
  }
}

async function request<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`, body?.issues);
  }
  return body as T;
}

export async function listContacts(): Promise<Contact[]> {
  const data = await request<{ contacts: Contact[] }>(BASE);
  return data.contacts;
}

export async function getContact(id: string): Promise<Contact> {
  const data = await request<{ contact: Contact }>(`${BASE}/${id}`);
  return data.contact;
}

export async function createContact(input: CreateContactInput): Promise<Contact> {
  const data = await request<{ contact: Contact }>(BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.contact;
}

export async function updateContact(id: string, input: UpdateContactInput): Promise<Contact> {
  const data = await request<{ contact: Contact }>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.contact;
}

export async function deleteContact(id: string): Promise<void> {
  await request<void>(`${BASE}/${id}`, { method: "DELETE" });
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npm --prefix frontend run build
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api/contacts.ts
git commit -m "feat(contacts): add typed fetch client for /api/contacts"
```

---

## Task 11: Build the shared `ContactForm` component

**Files:**
- Create: `frontend/src/pages/contacts/ContactForm.tsx`
- Create: `frontend/tests/ContactForm.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/tests/ContactForm.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactForm } from "../src/pages/contacts/ContactForm";

describe("ContactForm", () => {
  it("renders name, email, and phone inputs and a submit button", () => {
    render(<ContactForm onSubmit={vi.fn()} submitLabel="Save" />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("shows a required-field error when submitting with an empty name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ContactForm onSubmit={onSubmit} submitLabel="Save" />);
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an email-format error when email is malformed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ContactForm onSubmit={onSubmit} submitLabel="Save" />);
    await user.type(screen.getByLabelText(/name/i), "Alice");
    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/must be a valid email/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with the parsed values on a valid submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ContactForm onSubmit={onSubmit} submitLabel="Save" />);
    await user.type(screen.getByLabelText(/name/i), "Alice");
    await user.type(screen.getByLabelText(/email/i), "alice@example.com");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Alice", email: "alice@example.com" }),
    );
  });

  it("pre-fills initialValues", () => {
    render(
      <ContactForm
        onSubmit={vi.fn()}
        submitLabel="Save"
        initialValues={{ name: "Zoe", email: "zoe@example.com", phone: "555" }}
      />,
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue("Zoe");
    expect(screen.getByLabelText(/email/i)).toHaveValue("zoe@example.com");
    expect(screen.getByLabelText(/phone/i)).toHaveValue("555");
  });
});
```

- [ ] **Step 2: Add the testing-library/user-event dev dep if it's missing**

```bash
npm --prefix frontend ls @testing-library/user-event 2>/dev/null | grep user-event || npm --prefix frontend install -D @testing-library/user-event@^14
```

Expected: either already present or installed cleanly.

- [ ] **Step 3: Run the test to verify it fails**

```bash
npm --prefix frontend test -- ContactForm
```

Expected: FAIL — module `../src/pages/contacts/ContactForm` not found.

- [ ] **Step 4: Implement `ContactForm`**

Create `frontend/src/pages/contacts/ContactForm.tsx`:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createContactSchema, type CreateContactInput } from "@/lib/contact-schemas";

export interface ContactFormProps {
  initialValues?: Partial<CreateContactInput>;
  submitLabel: string;
  onSubmit: (values: CreateContactInput) => void | Promise<void>;
  serverError?: string | null;
}

export function ContactForm({ initialValues, submitLabel, onSubmit, serverError }: ContactFormProps) {
  const form = useForm<CreateContactInput>({
    resolver: zodResolver(createContactSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      email: initialValues?.email ?? "",
      phone: initialValues?.phone ?? "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => onSubmit(v))} className="space-y-4">
        {serverError ? (
          <p role="alert" className="text-sm text-destructive">{serverError}</p>
        ) : null}
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
                <Input type="email" autoComplete="email" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input type="tel" autoComplete="tel" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm --prefix frontend test -- ContactForm
```

Expected: PASS — all 5 tests green.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/contacts/ContactForm.tsx frontend/tests/ContactForm.test.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat(contacts): add shared ContactForm with validation"
```

---

## Task 12: Build the `ContactsList` page

**Files:**
- Create: `frontend/src/pages/contacts/ContactsList.tsx`
- Create: `frontend/tests/ContactsList.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/tests/ContactsList.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ContactsList } from "../src/pages/contacts/ContactsList";
import * as api from "../src/lib/api/contacts";
import type { Contact } from "../src/lib/contact-schemas";

const fixture: Contact[] = [
  { id: "1", userId: "u", name: "Anna", email: null, phone: null, createdAt: "", updatedAt: "" },
  { id: "2", userId: "u", name: "Zoe", email: "zoe@example.com", phone: null, createdAt: "", updatedAt: "" },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

function renderList() {
  return render(
    <MemoryRouter>
      <ContactsList />
    </MemoryRouter>,
  );
}

describe("ContactsList", () => {
  it("renders the empty state when there are no contacts", async () => {
    vi.spyOn(api, "listContacts").mockResolvedValue([]);
    renderList();
    expect(await screen.findByText(/no contacts yet/i)).toBeInTheDocument();
  });

  it("renders a row per contact", async () => {
    vi.spyOn(api, "listContacts").mockResolvedValue(fixture);
    renderList();
    expect(await screen.findByText("Anna")).toBeInTheDocument();
    expect(await screen.findByText("Zoe")).toBeInTheDocument();
  });

  it("filters by name case-insensitively as the user types", async () => {
    vi.spyOn(api, "listContacts").mockResolvedValue(fixture);
    const user = userEvent.setup();
    renderList();
    await screen.findByText("Anna");
    await user.type(screen.getByPlaceholderText(/search/i), "ZO");
    await waitFor(() => expect(screen.queryByText("Anna")).not.toBeInTheDocument());
    expect(screen.getByText("Zoe")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm --prefix frontend test -- ContactsList
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ContactsList`**

Create `frontend/src/pages/contacts/ContactsList.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listContacts } from "@/lib/api/contacts";
import type { Contact } from "@/lib/contact-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ContactsList() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listContacts()
      .then(setContacts)
      .catch((e: Error) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!contacts) return [];
    const q = query.toLowerCase();
    return q ? contacts.filter((c) => c.name.toLowerCase().includes(q)) : contacts;
  }, [contacts, query]);

  if (error) return <div className="p-8 text-destructive">Failed to load contacts: {error}</div>;
  if (contacts === null) return <div className="p-8">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Button asChild>
          <Link to="/contacts/new">New contact</Link>
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-muted-foreground">No contacts yet.</p>
      ) : (
        <>
          <Input
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Phone</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="py-2">
                    <Link className="underline" to={`/contacts/${c.id}`}>
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-2">{c.email ?? "—"}</td>
                  <td className="py-2">{c.phone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
```

Note the `<Button asChild>` pattern from shadcn — verify that the existing Button component supports `asChild`. If it doesn't (it's not a default in every shadcn install), replace with a plain `<Link className="...">` styled like a button. Run the test in the next step; if it fails on this, swap to the plain link.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm --prefix frontend test -- ContactsList
```

Expected: PASS — all 3 tests green.

If `<Button asChild>` errors, replace with:

```tsx
<Link
  to="/contacts/new"
  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
>
  New contact
</Link>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/contacts/ContactsList.tsx frontend/tests/ContactsList.test.tsx
git commit -m "feat(contacts): add ContactsList page with search and empty state"
```

---

## Task 13: Build the `ContactNew` page

**Files:**
- Create: `frontend/src/pages/contacts/ContactNew.tsx`

No unit test here — `ContactNew` is a 15-line wrapper around `ContactForm`. It's covered by the E2E in Task 17.

- [ ] **Step 1: Implement `ContactNew`**

Create `frontend/src/pages/contacts/ContactNew.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContactForm } from "./ContactForm";
import { createContact } from "@/lib/api/contacts";
import type { CreateContactInput } from "@/lib/contact-schemas";

export default function ContactNew() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(values: CreateContactInput) {
    setServerError(null);
    try {
      const contact = await createContact(values);
      navigate(`/contacts/${contact.id}`);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Failed to create contact");
    }
  }

  return (
    <div className="mx-auto max-w-md p-8 space-y-6">
      <h1 className="text-2xl font-semibold">New contact</h1>
      <ContactForm onSubmit={onSubmit} submitLabel="Create" serverError={serverError} />
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npm --prefix frontend run build
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/contacts/ContactNew.tsx
git commit -m "feat(contacts): add ContactNew page"
```

---

## Task 14: Build the `ContactDetail` page

**Files:**
- Create: `frontend/src/pages/contacts/ContactDetail.tsx`

- [ ] **Step 1: Implement `ContactDetail`**

Create `frontend/src/pages/contacts/ContactDetail.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ApiError, deleteContact, getContact } from "@/lib/api/contacts";
import type { Contact } from "@/lib/contact-schemas";

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null | "not-found">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getContact(id)
      .then(setContact)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) setContact("not-found");
        else setError(e instanceof Error ? e.message : "Failed to load contact");
      });
  }, [id]);

  async function onDelete() {
    if (!id) return;
    if (!window.confirm("Delete this contact?")) return;
    try {
      await deleteContact(id);
      navigate("/contacts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete contact");
    }
  }

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (contact === null) return <div className="p-8">Loading…</div>;
  if (contact === "not-found") {
    return (
      <div className="mx-auto max-w-md p-8 space-y-4">
        <p>Contact not found.</p>
        <Link className="underline" to="/contacts">Back to contacts</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-8 space-y-6">
      <h1 className="text-2xl font-semibold">{contact.name}</h1>
      <dl className="space-y-2">
        <div>
          <dt className="text-sm text-muted-foreground">Email</dt>
          <dd>{contact.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Phone</dt>
          <dd>{contact.phone ?? "—"}</dd>
        </div>
      </dl>
      <div className="flex gap-2">
        <Button asChild>
          <Link to={`/contacts/${contact.id}/edit`}>Edit</Link>
        </Button>
        <Button variant="destructive" onClick={onDelete}>Delete</Button>
        <Button variant="outline" asChild>
          <Link to="/contacts">Back</Link>
        </Button>
      </div>
    </div>
  );
}
```

(Same `<Button asChild>` caveat as Task 12 — fall back to a styled `<Link>` if `asChild` isn't supported.)

- [ ] **Step 2: Verify it type-checks**

```bash
npm --prefix frontend run build
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/contacts/ContactDetail.tsx
git commit -m "feat(contacts): add ContactDetail page with delete confirm"
```

---

## Task 15: Build the `ContactEdit` page

**Files:**
- Create: `frontend/src/pages/contacts/ContactEdit.tsx`

- [ ] **Step 1: Implement `ContactEdit`**

Create `frontend/src/pages/contacts/ContactEdit.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ContactForm } from "./ContactForm";
import { ApiError, getContact, updateContact } from "@/lib/api/contacts";
import type { Contact, CreateContactInput } from "@/lib/contact-schemas";

export default function ContactEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null | "not-found">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getContact(id)
      .then(setContact)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) setContact("not-found");
        else setError(e instanceof Error ? e.message : "Failed to load contact");
      });
  }, [id]);

  async function onSubmit(values: CreateContactInput) {
    if (!id) return;
    setError(null);
    try {
      await updateContact(id, values);
      navigate(`/contacts/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  if (contact === null) return <div className="p-8">Loading…</div>;
  if (contact === "not-found") {
    return (
      <div className="mx-auto max-w-md p-8 space-y-4">
        <p>Contact not found.</p>
        <Link className="underline" to="/contacts">Back to contacts</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Edit contact</h1>
      <ContactForm
        initialValues={{
          name: contact.name,
          email: contact.email ?? "",
          phone: contact.phone ?? "",
        }}
        submitLabel="Save"
        onSubmit={onSubmit}
        serverError={error}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npm --prefix frontend run build
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/contacts/ContactEdit.tsx
git commit -m "feat(contacts): add ContactEdit page"
```

---

## Task 16: Wire up routes and link from home

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/home.tsx`

- [ ] **Step 1: Add the four routes inside the `ProtectedRoute` block**

Modify `frontend/src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/protected-route";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import HomePage from "@/pages/home";
import { ContactsList } from "@/pages/contacts/ContactsList";
import ContactNew from "@/pages/contacts/ContactNew";
import ContactDetail from "@/pages/contacts/ContactDetail";
import ContactEdit from "@/pages/contacts/ContactEdit";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/contacts" element={<ContactsList />} />
          <Route path="/contacts/new" element={<ContactNew />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/contacts/:id/edit" element={<ContactEdit />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Add a "Go to contacts" link on the home page**

Modify `frontend/src/pages/home.tsx`. Replace the existing placeholder paragraph and update the JSX:

```tsx
import { Link, useNavigate } from "react-router-dom";
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
      <Button asChild>
        <Link to="/contacts">Go to contacts</Link>
      </Button>
      <Button variant="outline" onClick={handleLogout}>
        Log out
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Build and run frontend tests to confirm no regressions**

```bash
npm --prefix frontend run build
npm --prefix frontend test
```

Expected: clean build; all frontend tests pass.

- [ ] **Step 4: Smoke-test in the browser**

In one terminal:

```bash
npm run db:up
npm run dev
```

In a browser, visit http://localhost:5173, log in as `alice@example.com / password123`, click "Go to contacts", create a contact, edit it, delete it. Confirm each step works end-to-end.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/home.tsx
git commit -m "feat(contacts): wire up routes and link from home"
```

---

## Task 17: Happy-path E2E spec

**Files:**
- Create: `e2e/contacts.spec.ts`

- [ ] **Step 1: Write the spec**

Create `e2e/contacts.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

async function signUpFresh(page: import("@playwright/test").Page, label: string) {
  const unique = `${label}-${Date.now()}`;
  const email = `${unique}@example.com`;
  await page.goto("/signup");
  await page.getByLabel(/name/i).fill(unique);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill("password123");
  await page.getByRole("button", { name: /sign up/i }).click();
  await expect(page).toHaveURL("/");
  return { email, name: unique };
}

test("contacts CRUD happy path", async ({ page }) => {
  await signUpFresh(page, "crud");

  // Visit contacts: empty state
  await page.getByRole("link", { name: /go to contacts/i }).click();
  await expect(page).toHaveURL("/contacts");
  await expect(page.getByText(/no contacts yet/i)).toBeVisible();

  // Create
  await page.getByRole("link", { name: /new contact/i }).click();
  await expect(page).toHaveURL("/contacts/new");
  await page.getByLabel(/name/i).fill("Charlie");
  await page.getByLabel(/email/i).fill("charlie@example.com");
  await page.getByLabel(/phone/i).fill("555-1212");
  await page.getByRole("button", { name: /create/i }).click();

  // Lands on detail page
  await expect(page).toHaveURL(/\/contacts\/[a-z0-9]+$/);
  await expect(page.getByRole("heading", { name: "Charlie" })).toBeVisible();
  await expect(page.getByText("charlie@example.com")).toBeVisible();

  // Edit
  await page.getByRole("link", { name: /edit/i }).click();
  await expect(page).toHaveURL(/\/contacts\/[a-z0-9]+\/edit$/);
  const phone = page.getByLabel(/phone/i);
  await phone.fill("");
  await phone.fill("999-9999");
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page.getByText("999-9999")).toBeVisible();

  // Delete
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /delete/i }).click();
  await expect(page).toHaveURL("/contacts");
  await expect(page.getByText(/no contacts yet/i)).toBeVisible();
});
```

The `page.once("dialog", ...)` line auto-accepts the `window.confirm()` dialog.

- [ ] **Step 2: Run the spec**

```bash
npm run e2e -- contacts.spec
```

Expected: PASS — both projects up via Playwright's `webServer`, the spec drives the full CRUD flow.

- [ ] **Step 3: Commit**

```bash
git add e2e/contacts.spec.ts
git commit -m "test(contacts): add happy-path CRUD E2E"
```

---

## Task 18: Cross-user isolation E2E spec

**Files:**
- Modify: `e2e/contacts.spec.ts`

- [ ] **Step 1: Append the isolation test**

Add to `e2e/contacts.spec.ts`:

```ts
test("contacts are isolated per user", async ({ page }) => {
  // User A creates a contact
  await signUpFresh(page, "iso-a");
  await page.goto("/contacts/new");
  await page.getByLabel(/name/i).fill("Private to A");
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByRole("heading", { name: "Private to A" })).toBeVisible();

  // User A logs out
  await page.goto("/");
  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page).toHaveURL("/login");

  // User B signs up fresh and goes to contacts
  await signUpFresh(page, "iso-b");
  await page.goto("/contacts");
  await expect(page.getByText(/no contacts yet/i)).toBeVisible();
  await expect(page.getByText("Private to A")).not.toBeVisible();
});
```

- [ ] **Step 2: Run the full E2E suite**

```bash
npm run e2e
```

Expected: all specs pass — `signup-to-home`, `contacts CRUD happy path`, `contacts are isolated per user`.

- [ ] **Step 3: Commit**

```bash
git add e2e/contacts.spec.ts
git commit -m "test(contacts): add cross-user isolation E2E"
```

---

## Task 19: Final regression sweep + lint

**Files:** none

- [ ] **Step 1: Run every quality check**

```bash
npm run lint
npm test
npm run e2e
```

Expected: all three commands exit 0.

- [ ] **Step 2: Confirm the manual smoke**

In the browser at http://localhost:5173, log in as Alice, create one contact, log out, log in as Bob, confirm `/contacts` shows the empty state. Log back in as Alice, delete the contact, confirm empty state.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feature/contacts
gh pr create --title "Contacts feature: per-user CRUD + tests" --body "$(cat <<'EOF'
## Summary
- Adds per-user `Contact` model + 5 REST endpoints scoped to the authenticated user
- Adds four screens: list (with search), detail, create, edit
- Both client- and server-side Zod validation; cross-user `:id` access returns 404
- Unit tests (Vitest) + 2 E2E specs (Playwright)

## Test plan
- [ ] `npm run lint` passes
- [ ] `npm test` (backend + frontend Vitest) passes
- [ ] `npm run e2e` passes
- [ ] Manual: Alice can create/edit/delete; Bob does not see Alice's contacts

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR created, linked back to the spec at `docs/superpowers/specs/2026-04-29-contacts-feature-design.md`.

---

## Plan self-review

- **Spec coverage:**
  - Per-user data model with `userId` FK → Task 1.
  - Five endpoints with cross-user 404 → Tasks 4-8.
  - Three screens (list/detail/edit) + create page → Tasks 12-15, wired in Task 16.
  - Client + server Zod validation, loose rules → Tasks 2 and 9, exercised in Tasks 5/7/11.
  - Duplicated schemas in `backend/` and `frontend/` → Task 9 (intentional).
  - Hard delete from detail page only → Task 14, with a `window.confirm()` instead of shadcn `AlertDialog` (deviation called out at the top of this plan).
  - Empty state, "Contact not found", network-error toast skipped → empty state in Task 12, not-found in Tasks 14/15. Network-error path is the `serverError` banner / `setError` state — best-effort, not heavily tested per the spec's explicit "intentionally not tested" list.
  - Backend tests: per-user list scoping, validation rejection, cross-user 404 on Get/Patch/Delete, partial Patch validation → Tasks 4-8.
  - Frontend tests: ContactForm required-field, email-format, submit shape; ContactsList rows + search + empty state → Tasks 11-12.
  - E2E: one happy path, one isolation → Tasks 17-18.
- **Type consistency:** `CreateContactInput` / `UpdateContactInput` / `Contact` defined once in each app's `contact-schemas` module; `ContactForm` consumes `CreateContactInput`; `ContactEdit` calls `updateContact(id, values)` with the same shape; API client's `Contact` interface mirrors the Prisma model field-for-field (including `email: string | null` and `phone: string | null`).
- **Placeholders:** none — every code step contains complete code; every command has expected output.
- **Known fragility:** `<Button asChild>` is used in Tasks 12, 14, and 16. If the scaffold's Button doesn't support `asChild` (it's a default in newer shadcn but not always in older installs), Task 12 explicitly tells the engineer how to fall back to a styled `<Link>`. The same fallback applies to 14 and 16.
