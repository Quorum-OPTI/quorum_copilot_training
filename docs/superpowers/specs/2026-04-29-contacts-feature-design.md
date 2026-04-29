# Contacts Feature — Design

**Date:** 2026-04-29
**Status:** Approved (brainstorm) — pending implementation plan
**Branch (lessons commit):** `docs/lesson-outlines`

## Summary

Add a basic, per-user contact / address book to the scaffold. A contact has a single `name` (required), optional `email`, and optional `phone`. Users see only their own contacts. Three screens: list, detail, edit (plus a create page). Validation is enforced on both the client and the server. The feature is deliberately small so it can serve as the working baseline for the W1 and W2 training lessons in [`docs/lessons/`](../../lessons/).

## Decisions captured during brainstorming

| Decision | Choice |
|---|---|
| Scope | Minimal CRUD (option A from brainstorm) |
| Ownership | Per-user private (every contact has a `userId`) |
| Fields | Single `name` (required), optional `email`, optional `phone` |
| Screens | Three: list, detail, edit (plus a separate create page) |
| List behavior | Default sort by name, plus a search box (case-insensitive name filter, client-side) |
| Validation | Both client and server, loose rules (name required, email format if provided) |
| Schema sharing | Duplicated Zod schemas in `backend/` and `frontend/` (no shared package) |
| Delete | Hard delete; only available from the detail page |

## Architecture

### Data model

A new `Contact` model in the existing Prisma schema:

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

Every query is scoped by `userId`. There is no soft-delete column.

### Frontend routes / screens

| Route | Screen | Purpose |
|---|---|---|
| `/contacts` | List | Table of the current user's contacts; search box (case-insensitive name filter); "New contact" button |
| `/contacts/new` | Create | `react-hook-form` form, Zod-validated; posts to API |
| `/contacts/:id` | Detail | Read-only view of one contact; "Edit" and "Delete" buttons |
| `/contacts/:id/edit` | Edit | Same form component as Create, pre-filled |

### API (Express, REST)

```
GET    /api/contacts          → list current user's contacts
POST   /api/contacts          → create
GET    /api/contacts/:id      → fetch one (404 if not owned)
PATCH  /api/contacts/:id      → update (404 if not owned)
DELETE /api/contacts/:id      → delete (404 if not owned)
```

**Authorization rule:** every `:id` endpoint loads the contact, checks `contact.userId === req.user.id`, and returns **404 (not 403)** on mismatch — same response as a genuinely missing record, which prevents existence-leak across users.

## Components

### Backend (`backend/src/`)

- `routes/contacts.ts` — Express router with the five endpoints. Auth middleware applied at the router level so handlers can assume `req.user` is set.
- `lib/contact-schemas.ts` — Zod schemas: `createContactSchema`, `updateContactSchema` (a partial of create).
- Prisma — `Contact` model added to the existing schema, plus a migration.

### Frontend (`frontend/src/`)

- `pages/contacts/ContactsList.tsx` — fetches the list, holds search state, renders the table.
- `pages/contacts/ContactDetail.tsx` — fetches one contact, renders read-only view, has Edit/Delete buttons.
- `pages/contacts/ContactForm.tsx` — shared form. Takes optional `initialValues` and an `onSubmit` prop. Used by both Create and Edit.
- `pages/contacts/ContactNew.tsx` — wraps `ContactForm` with create behavior.
- `pages/contacts/ContactEdit.tsx` — fetches the contact, then wraps `ContactForm` with edit behavior.
- `lib/contact-schemas.ts` — Zod schemas duplicated from the backend.
- `lib/api/contacts.ts` — typed fetch wrappers (`listContacts`, `getContact`, `createContact`, `updateContact`, `deleteContact`).
- New routes added to the existing react-router config.

## Data flow

### Create

1. User clicks "New contact" on `/contacts` → navigates to `/contacts/new`.
2. `ContactNew` renders `ContactForm` with empty `initialValues`.
3. `react-hook-form` + Zod validates on submit.
4. `createContact()` POSTs `/api/contacts` with cookies (Better Auth session).
5. Server middleware loads `req.user`; handler validates body with Zod, inserts with `userId: req.user.id`, returns the new contact.
6. Client redirects to `/contacts/:id`.

### Edit

1. From `/contacts/:id`, user clicks "Edit" → navigates to `/contacts/:id/edit`.
2. `ContactEdit` calls `getContact(id)` to load current values.
3. Form pre-fills, user edits, submit validates and PATCHes `/api/contacts/:id`.
4. Server checks ownership (404 otherwise), validates partial body, updates.
5. Client redirects back to `/contacts/:id`.

### Delete

1. From `/contacts/:id`, user clicks "Delete" → confirm dialog (shadcn `AlertDialog`).
2. On confirm, `deleteContact(id)` DELETEs `/api/contacts/:id`.
3. Server checks ownership (404 otherwise), deletes.
4. Client redirects to `/contacts`.

### List + search

1. `ContactsList` calls `listContacts()` once on mount.
2. Search input updates a local state string.
3. List rendered = `contacts.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))`. No refetch on search.

## Error handling

**Validation errors**

- *Client:* `react-hook-form` shows inline errors under each field ("Name is required", "Must be a valid email"). Submit is blocked until the form is valid.
- *Server:* if a request slips past client validation (curl, bug, drift between the duplicated schemas), the API returns `400` with `{ error: "ValidationError", issues: [...] }`. The form surfaces these as a top-of-form error banner.

**Auth errors**

- Unauthenticated requests to `/api/contacts/*` return `401`. The frontend's API wrapper catches `401` and redirects to the login page (existing scaffold pattern, reused).

**Not-found / authorization**

- `GET/PATCH/DELETE /api/contacts/:id` returns `404` whenever the contact doesn't exist *or* belongs to another user. No `403` — the same response prevents existence-leak.
- On the frontend, `ContactDetail` and `ContactEdit` render a "Contact not found" state when the API returns 404, with a link back to `/contacts`.

**Network / unexpected errors**

- API wrapper surfaces non-2xx, non-401, non-404 responses as a generic toast ("Something went wrong. Please try again."). Underlying error is logged to the console.
- No retry logic.

**Empty state**

- `/contacts` with zero contacts shows "No contacts yet" plus a "New contact" CTA.

## Testing

### Backend unit tests (Vitest, `backend/tests/`)

`contacts.test.ts` — covers the router. One spec file with grouped `describe` blocks per endpoint:

- List returns only the current user's contacts (Alice cannot see Bob's).
- Create rejects invalid bodies (missing name, malformed email) with `400`.
- Get/Patch/Delete return `404` when the id belongs to another user.
- Patch validates partial bodies.

Uses the existing test database setup from the scaffold. Each test seeds two users and cleans up.

### Frontend unit tests (Vitest + React Testing Library, `frontend/tests/`)

- `ContactForm.test.tsx` — form renders, required-field error appears, email-format error appears, submit calls `onSubmit` with the right shape.
- `ContactsList.test.tsx` — renders rows from a mocked `listContacts`, search input filters case-insensitively, empty state shows when there are zero contacts.

Other components (`ContactDetail`, `ContactNew`, `ContactEdit`) are thin wrappers and are covered by E2E rather than unit.

### E2E (Playwright, `e2e/`)

`contacts.spec.ts` — one happy-path spec:

1. Log in as Alice (reuse existing helper).
2. Visit `/contacts`, see empty state.
3. Click "New contact", fill form, submit.
4. Land on detail page, see the new contact.
5. Click Edit, change phone, save, see updated detail.
6. Click Delete, confirm, land back on `/contacts`, see empty state again.

One isolation spec: log in as Alice, create a contact, log out, log in as Bob, confirm `/contacts` is empty.

### What's intentionally not tested

- Network-failure toast paths.
- Search edge cases beyond a single happy assertion.

These are good staged-ticket fodder later ("add a test for X").

## Out of scope (deliberate)

The following are intentionally absent so they can be staged as Copilot training tickets in W1 and W2:

- Pagination on the list page.
- Server-side search (current search is client-side only).
- Phone-format normalization (E.164).
- Soft delete and restore.
- Tags or grouping.
- CSV import / export.
- Sharing a contact with another user.
- Notes / multi-line free text on a contact.
- A dedicated "deleted contact" not-found page (current behavior shows an inline state).
- DRY-ing up the duplicated Zod schemas into a shared package.

Each of these is a plausible candidate for a `gh` issue, a `/speckit.specify` exercise, or a "review-the-diff" cross-audit.
