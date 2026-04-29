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
