import { defineConfig } from "@playwright/test";

const FRONTEND = "http://localhost:5173";
const BACKEND = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: FRONTEND,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: [
    {
      command: "npm --prefix backend run dev",
      url: `${BACKEND}/health`,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm --prefix frontend run dev",
      url: FRONTEND,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
