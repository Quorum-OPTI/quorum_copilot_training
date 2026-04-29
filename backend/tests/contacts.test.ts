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
