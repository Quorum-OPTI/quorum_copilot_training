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
