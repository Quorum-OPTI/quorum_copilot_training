import { test, expect } from "@playwright/test";

async function signUpFresh(page: import("@playwright/test").Page, label: string) {
  const unique = `${label}-${Date.now()}`;
  const email = `${unique}@example.com`;
  await page.goto("/signup");
  await page.getByLabel(/name/i).fill(unique);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill("password123");
  await page.getByRole("button", { name: /sign up/i }).click();
  await expect(page).toHaveURL("/");
  return { email, name: unique };
}

test("contacts CRUD happy path", async ({ page }) => {
  await signUpFresh(page, "crud");

  // Visit contacts: empty state
  await page.getByRole("link", { name: /go to contacts/i }).click();
  await expect(page).toHaveURL("/contacts");
  await expect(page.getByText(/no contacts yet/i)).toBeVisible();

  // Create
  await page.getByRole("link", { name: /new contact/i }).click();
  await expect(page).toHaveURL("/contacts/new");
  await page.getByLabel(/name/i).fill("Charlie");
  await page.getByLabel(/email/i).fill("charlie@example.com");
  await page.getByLabel(/phone/i).fill("555-1212");
  await page.getByRole("button", { name: /create/i }).click();

  // Lands on detail page
  await expect(page).toHaveURL(/\/contacts\/[a-z0-9]+$/);
  await expect(page.getByRole("heading", { name: "Charlie" })).toBeVisible();
  await expect(page.getByText("charlie@example.com")).toBeVisible();

  // Edit
  await page.getByRole("link", { name: /edit/i }).click();
  await expect(page).toHaveURL(/\/contacts\/[a-z0-9]+\/edit$/);
  const phone = page.getByLabel(/phone/i);
  await phone.fill("");
  await phone.fill("999-9999");
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page.getByText("999-9999")).toBeVisible();

  // Delete
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /delete/i }).click();
  await expect(page).toHaveURL("/contacts");
  await expect(page.getByText(/no contacts yet/i)).toBeVisible();
});

test("contacts are isolated per user", async ({ page }) => {
  // User A creates a contact
  await signUpFresh(page, "iso-a");
  await page.goto("/contacts/new");
  await page.getByLabel(/name/i).fill("Private to A");
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByRole("heading", { name: "Private to A" })).toBeVisible();

  // User A logs out
  await page.goto("/");
  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page).toHaveURL("/login");

  // User B signs up fresh and goes to contacts
  await signUpFresh(page, "iso-b");
  await page.goto("/contacts");
  await expect(page.getByText(/no contacts yet/i)).toBeVisible();
  await expect(page.getByText("Private to A")).not.toBeVisible();
});
