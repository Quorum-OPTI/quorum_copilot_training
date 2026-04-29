import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z
    .string()
    .min(16)
    .refine(
      (s) => s !== "change-me-to-a-long-random-string",
      "BETTER_AUTH_SECRET is still the placeholder value — generate a real secret with `node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"`",
    ),
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
