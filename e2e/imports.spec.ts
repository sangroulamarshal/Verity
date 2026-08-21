import { test, expect } from "@playwright/test";

async function registerNewOrg(page: import("@playwright/test").Page, orgName: string) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Organization name").fill(orgName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correcthorse123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/dashboard");
}

function csvFile(name: string, contents: string) {
  return { name, mimeType: "text/csv", buffer: Buffer.from(contents, "utf-8") };
}

test.describe("CSV import", () => {
  test("upload, map, preview, and confirm imports valid rows", async ({ page }) => {
    await registerNewOrg(page, `Import Org ${Date.now()}`);

    await page.goto("/imports");
    await page.getByRole("button", { name: "Import transactions" }).click();

    // Headers here exactly match the built-in alias list, so the
    // mapping step should auto-suggest every field without the user
    // having to touch a dropdown.
    await page
      .getByLabel("File")
      .setInputFiles(
        csvFile(
          "statement.csv",
          "Date,Amount,Type,Category\n" +
            "2026-01-15,125.50,Income,Consulting\n" +
            "2026-01-16,42.00,Expense,Office supplies\n"
        )
      );
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Match each field to a column")).toBeVisible();
    await page.getByRole("button", { name: "Preview" }).click();

    await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Consulting")).toBeVisible();
    await expect(page.getByText("Office supplies")).toBeVisible();

    await page.getByRole("button", { name: "Confirm import" }).click();
    await expect(page.getByText("Import complete.")).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await page.reload();

    await expect(page.getByText("statement.csv")).toBeVisible();
    await expect(page.getByText("2", { exact: true }).first()).toBeVisible();

    await page.goto("/transactions");
    await expect(page.getByText("Consulting")).toBeVisible();
    await expect(page.getByText("Office supplies")).toBeVisible();
  });

  test("an incomplete mapping blocks preview with a clear reason", async ({ page }) => {
    await registerNewOrg(page, `Mapping Org ${Date.now()}`);

    await page.goto("/imports");
    await page.getByRole("button", { name: "Import transactions" }).click();

    // No header aliases to "date", so the mapping starts incomplete and
    // must stay that way until the user maps one manually.
    await page
      .getByLabel("File")
      .setInputFiles(csvFile("orphan.csv", "Amount,Type\n10.00,Expense\n"));
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Map a column to Date.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Preview" })).toBeDisabled();
  });

  test("a file with only invalid rows reports zero valid and blocks import", async ({ page }) => {
    await registerNewOrg(page, `Invalid Org ${Date.now()}`);

    await page.goto("/imports");
    await page.getByRole("button", { name: "Import transactions" }).click();

    await page
      .getByLabel("File")
      .setInputFiles(
        csvFile("bad.csv", "Date,Amount,Type,Category\nnot-a-date,not-a-number,Sideways,Fuel\n")
      );
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Preview" }).click();

    await expect(page.getByRole("button", { name: "Confirm import" })).toBeDisabled();
  });
});
