import { test, expect } from "@playwright/test";

test("signup → land on home with welcome", async ({ page }) => {
  const unique = Date.now();
  const email = `e2e-${unique}@example.com`;

  await page.goto("/signup");
  await page.getByLabel(/name/i).fill(`E2E User ${unique}`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill("password123");
  await page.getByRole("button", { name: /sign up/i }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading")).toContainText(`Welcome, E2E User ${unique}`);
});
