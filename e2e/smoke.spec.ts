import { test, expect } from "@playwright/test";

test("home page renders the Verity shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Financial clarity you can trust." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Verity" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Toggle theme" })).toBeVisible();
});

test("theme toggle switches to dark mode", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Toggle theme" }).click();
  await page.getByRole("menuitem", { name: "Dark" }).click();

  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("register, land on dashboard, and log out", async ({ page }) => {
  const uniqueEmail = `e2e-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Organization name").fill("E2E Test Org");
  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password").fill("correcthorse123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByText(uniqueEmail)).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).first().click();
  await expect(page).toHaveURL("/login");
});

test("unauthenticated access to /dashboard redirects to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
});

test("wrong password shows a generic error, not user enumeration", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody-with-this-email@example.com");
  await page.getByLabel("Password").fill("whatever-password-123");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});
