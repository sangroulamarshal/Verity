import { test, expect } from "@playwright/test";

// See e2e/transactions.spec.ts for the shared registerNewOrg() helper's
// own comment on the Supabase test-project assumption these
// registration-dependent tests share.

async function registerNewOrg(page: import("@playwright/test").Page, orgName: string) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Organization name").fill(orgName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correcthorse123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/dashboard");
}

test.describe("customer CRM", () => {
  test("create a customer and see it in the list", async ({ page }) => {
    await registerNewOrg(page, `Create Customer Org ${Date.now()}`);

    await page.goto("/customers");
    await page.getByRole("button", { name: "New customer" }).click();

    await page.getByLabel("Name").fill("Acme Ltd");
    await page.getByLabel("Email (optional)").fill("billing@acme.example");
    await page.getByRole("button", { name: "Add customer" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Acme Ltd")).toBeVisible();
    await expect(page.getByText("1 customer on file.")).toBeVisible();
  });

  test("edit an existing customer", async ({ page }) => {
    await registerNewOrg(page, `Edit Customer Org ${Date.now()}`);

    await page.goto("/customers");
    await page.getByRole("button", { name: "New customer" }).click();
    await page.getByLabel("Name").fill("Original Name");
    await page.getByRole("button", { name: "Add customer" }).click();
    await expect(page.getByText("Original Name")).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Name").fill("Updated Name");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Updated Name")).toBeVisible();
    await expect(page.getByText("Original Name")).toHaveCount(0);
  });

  test("customer detail page shows contact info and lifetime totals", async ({ page }) => {
    await registerNewOrg(page, `Detail Customer Org ${Date.now()}`);

    await page.goto("/customers");
    await page.getByRole("button", { name: "New customer" }).click();
    await page.getByLabel("Name").fill("Detail Co");
    await page.getByLabel("Email (optional)").fill("hello@detailco.example");
    await page.getByRole("button", { name: "Add customer" }).click();
    await expect(page.getByText("Detail Co")).toBeVisible();

    await page.getByRole("link", { name: "Detail Co" }).click();
    await expect(page.getByRole("heading", { name: "Detail Co" })).toBeVisible();
    await expect(page.getByText("hello@detailco.example")).toBeVisible();
    await expect(page.getByText("No transactions linked to this customer yet.")).toBeVisible();
  });

  test("delete a customer removes it from the list", async ({ page }) => {
    await registerNewOrg(page, `Delete Customer Org ${Date.now()}`);

    await page.goto("/customers");
    await page.getByRole("button", { name: "New customer" }).click();
    await page.getByLabel("Name").fill("To Be Deleted");
    await page.getByRole("button", { name: "Add customer" }).click();
    await expect(page.getByText("To Be Deleted")).toBeVisible();

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("To Be Deleted")).toHaveCount(0);
    await expect(page.getByText("No customers found")).toBeVisible();
  });

  test("linking a transaction to a customer via the picker shows it on the customer's detail page", async ({
    page,
  }) => {
    await registerNewOrg(page, `Link Customer Org ${Date.now()}`);

    await page.goto("/customers");
    await page.getByRole("button", { name: "New customer" }).click();
    await page.getByLabel("Name").fill("Linked Customer Ltd");
    await page.getByRole("button", { name: "Add customer" }).click();
    await expect(page.getByText("Linked Customer Ltd")).toBeVisible();

    await page.goto("/transactions");
    await page.getByRole("button", { name: "New transaction" }).click();
    await page.getByLabel("Date").fill("2026-01-15");
    await page.getByLabel("Amount").fill("250");
    await page.getByLabel("Category").fill("Consulting income");
    // Type-to-search: the picker only queries after a debounce, so this
    // waits on the suggestion actually appearing rather than a fixed delay.
    await page.getByLabel("Customer/Vendor (optional)").fill("Linked Customer");
    await page.getByRole("option", { name: "Linked Customer Ltd" }).click();
    await page.getByRole("button", { name: "Add transaction" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.goto("/customers");
    await page.getByRole("link", { name: "Linked Customer Ltd" }).click();
    await expect(page.getByText("Consulting income")).toBeVisible();
    await expect(page.getByText("1 transaction")).toBeVisible();
  });

  test("one organization's customers are never visible to another", async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await registerNewOrg(pageA, `Customer Org A ${Date.now()}`);
    await pageA.goto("/customers");
    await pageA.getByRole("button", { name: "New customer" }).click();
    await pageA.getByLabel("Name").fill("Org A Only Customer");
    await pageA.getByRole("button", { name: "Add customer" }).click();
    await expect(pageA.getByText("Org A Only Customer")).toBeVisible();

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await registerNewOrg(pageB, `Customer Org B ${Date.now()}`);
    await pageB.goto("/customers");

    await expect(pageB.getByText("No customers found")).toBeVisible();
    await expect(pageB.getByText("Org A Only Customer")).toHaveCount(0);

    await contextA.close();
    await contextB.close();
  });
});
