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
        // DEV ONLY: secure=false because dev runs over plain HTTP via Vite proxy.
        // For real deployment over HTTPS, flip to `secure: true` (or branch on NODE_ENV).
        attributes: { sameSite: "lax", httpOnly: true, secure: false },
      },
    },
  },
});
