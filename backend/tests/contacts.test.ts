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
