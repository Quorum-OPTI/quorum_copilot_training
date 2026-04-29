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
  // Express 5 requires named wildcards; *splat matches any path segment(s).
  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json());

  app.use("/health", healthRouter);

  return app;
}
