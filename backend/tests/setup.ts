// Loads test-time defaults so tests don't depend on a real .env file.
process.env.DATABASE_URL ??= "postgresql://copilot:copilot@localhost:5432/copilot_training";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.NODE_ENV = "test";
