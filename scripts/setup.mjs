#!/usr/bin/env node
// One-shot bootstrap: installs deps in root/backend/frontend, generates Prisma client,
// applies migrations, and seeds demo users. Idempotent.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

async function step(label, fn) {
  console.log(`\n▶ ${label}`);
  await fn();
  console.log(`✔ ${label}`);
}

async function main() {
  if (!existsSync(path.join(ROOT, "backend", ".env"))) {
    console.log("Creating backend/.env from backend/.env.example");
    await run("cp", [path.join(ROOT, "backend", ".env.example"), path.join(ROOT, "backend", ".env")]);
    console.warn("⚠ Edit backend/.env and replace BETTER_AUTH_SECRET with a real random value before running the app in dev.");
  }

  await step("Install root deps", () => run("npm", ["install"], { cwd: ROOT }));
  await step("Install backend deps", () => run("npm", ["install"], { cwd: path.join(ROOT, "backend") }));
  await step("Install frontend deps", () => run("npm", ["install"], { cwd: path.join(ROOT, "frontend") }));
  await step("Generate Prisma client", () =>
    run("npm", ["run", "prisma:generate"], { cwd: path.join(ROOT, "backend") }),
  );
  await step("Apply migrations", () =>
    run("npm", ["run", "prisma:migrate"], { cwd: path.join(ROOT, "backend") }),
  );
  await step("Seed demo users", () =>
    run("npm", ["run", "db:seed"], { cwd: path.join(ROOT, "backend") }),
  );

  console.log("\nSetup complete. Next: `npm run dev`");
}

main().catch((err) => {
  console.error("\n✖ Setup failed:", err.message);
  console.error("Hint: ensure Postgres is running (`npm run db:up`) before re-running setup.");
  process.exit(1);
});
