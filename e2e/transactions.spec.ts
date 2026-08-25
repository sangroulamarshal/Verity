import { test, expect } from "@playwright/test";

// registerNewOrg() below now calls a real Supabase Auth project — see
// e2e/smoke.spec.ts for the "Confirm email" test-project assumption
// these registration-dependent tests share.

async function registerNewOrg(page: import("@playwright/test").Page, orgName: string) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Organization name").fill(orgName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correcthorse123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/dashboard");
}

test.describe("manual transaction entry", () => {
  test("create a transaction and see it in the list", async ({ page }) => {
    await registerNewOrg(page, `Create Org ${Date.now()}`);

    await page.goto("/transactions");
    await page.getByRole("button", { name: "New transaction" }).click();

    await page.getByLabel("Date").fill("2026-01-15");
    await page.getByLabel("Amount").fill("125.50");
    await page.getByLabel("Category").fill("Consulting income");
    await page.getByRole("button", { name: "Add transaction" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Consulting income")).toBeVisible();
    await expect(page.getByText("1 transaction recorded.")).toBeVisible();
  });

  test("edit an existing transaction", async ({ page }) => {
    await registerNewOrg(page, `Edit Org ${Date.now()}`);

    await page.goto("/transactions");
    await page.getByRole("button", { name: "New transaction" }).click();
    await page.getByLabel("Date").fill("2026-01-15");
    await page.getByLabel("Amount").fill("50");
    await page.getByLabel("Category").fill("Original category");
    await page.getByRole("button", { name: "Add transaction" }).click();
    await expect(page.getByText("Original category")).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    const categoryInput = page.getByLabel("Category");
    await categoryInput.fill("Updated category");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Updated category")).toBeVisible();
    await expect(page.getByText("Original category")).toHaveCount(0);
  });

  test("delete a transaction removes it from the list", async ({ page }) => {
    await registerNewOrg(page, `Delete Org ${Date.now()}`);

    await page.goto("/transactions");
    await page.getByRole("button", { name: "New transaction" }).click();
    await page.getByLabel("Date").fill("2026-01-15");
    await page.getByLabel("Amount").fill("20");
    await page.getByLabel("Category").fill("To be deleted");
    await page.getByRole("button", { name: "Add transaction" }).click();
    await expect(page.getByText("To be deleted")).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("To be deleted")).toHaveCount(0);
    await expect(page.getByText("No transactions yet")).toBeVisible();
  });

  test("an invalid amount shows a validation error and does not create a row", async ({
    page,
  }) => {
    await registerNewOrg(page, `Validation Org ${Date.now()}`);

    await page.goto("/transactions");
    await page.getByRole("button", { name: "New transaction" }).click();

    await page.getByLabel("Date").fill("2026-01-15");
    await page.getByLabel("Amount").fill("-50");
    await page.getByLabel("Category").fill("Should not save");
    await page.getByRole("button", { name: "Add transaction" }).click();

    await expect(page.getByText("Amount must be greater than zero.")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("one organization's transactions are never visible to another", async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await registerNewOrg(pageA, `Org A ${Date.now()}`);
    await pageA.goto("/transactions");
    await pageA.getByRole("button", { name: "New transaction" }).click();
    await pageA.getByLabel("Date").fill("2026-01-15");
    await pageA.getByLabel("Amount").fill("100");
    await pageA.getByLabel("Category").fill("Org A only transaction");
    await pageA.getByRole("button", { name: "Add transaction" }).click();
    await expect(pageA.getByText("Org A only transaction")).toBeVisible();

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await registerNewOrg(pageB, `Org B ${Date.now()}`);
    await pageB.goto("/transactions");

    // A brand-new org must see an empty list — never org A's data, even
    // though both hit the same /transactions route in the same run.
    await expect(pageB.getByText("No transactions yet")).toBeVisible();
    await expect(pageB.getByText("Org A only transaction")).toHaveCount(0);

    await contextA.close();
    await contextB.close();
  });
});
