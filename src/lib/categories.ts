export type CategoryType = "INCOME" | "EXPENSE" | "BOTH";

export interface PredefinedCategory {
  name: string;
  type: CategoryType;
}

export const PREDEFINED_CATEGORIES: PredefinedCategory[] = [
  // Income (18)
  { name: "Sales Revenue",              type: "INCOME" },
  { name: "Service Income",             type: "INCOME" },
  { name: "Consulting Fees",            type: "INCOME" },
  { name: "Rental Income",              type: "INCOME" },
  { name: "Interest Income",            type: "INCOME" },
  { name: "Dividend Income",            type: "INCOME" },
  { name: "Grant Income",               type: "INCOME" },
  { name: "Refunds Received",           type: "INCOME" },
  { name: "Commission Income",          type: "INCOME" },
  { name: "Licensing Revenue",          type: "INCOME" },
  { name: "Subscription Revenue",       type: "INCOME" },
  { name: "Royalties",                  type: "INCOME" },
  { name: "Sponsorship Income",         type: "INCOME" },
  { name: "Affiliate Income",           type: "INCOME" },
  { name: "Asset Sale",                 type: "INCOME" },
  { name: "Insurance Payout",           type: "INCOME" },
  { name: "Tax Refund",                 type: "INCOME" },
  { name: "Other Income",               type: "INCOME" },

  // Expense (30)
  { name: "Payroll",                    type: "EXPENSE" },
  { name: "Contractor Payments",        type: "EXPENSE" },
  { name: "Rent",                       type: "EXPENSE" },
  { name: "Utilities",                  type: "EXPENSE" },
  { name: "Software & Subscriptions",   type: "EXPENSE" },
  { name: "Office Supplies",            type: "EXPENSE" },
  { name: "Travel & Transport",         type: "EXPENSE" },
  { name: "Meals & Entertainment",      type: "EXPENSE" },
  { name: "Marketing & Advertising",    type: "EXPENSE" },
  { name: "Professional Services",      type: "EXPENSE" },
  { name: "Legal & Compliance",         type: "EXPENSE" },
  { name: "Accounting & Audit",         type: "EXPENSE" },
  { name: "Insurance",                  type: "EXPENSE" },
  { name: "Bank Charges",               type: "EXPENSE" },
  { name: "Loan Repayment",             type: "EXPENSE" },
  { name: "Interest Expense",           type: "EXPENSE" },
  { name: "Depreciation",               type: "EXPENSE" },
  { name: "Repairs & Maintenance",      type: "EXPENSE" },
  { name: "Stock & Inventory",          type: "EXPENSE" },
  { name: "Cost of Goods Sold",         type: "EXPENSE" },
  { name: "Shipping & Logistics",       type: "EXPENSE" },
  { name: "Tax & Compliance",           type: "EXPENSE" },
  { name: "Training & Development",     type: "EXPENSE" },
  { name: "Research & Development",     type: "EXPENSE" },
  { name: "IT & Technology",            type: "EXPENSE" },
  { name: "Equipment Purchase",         type: "EXPENSE" },
  { name: "Printing & Stationery",      type: "EXPENSE" },
  { name: "Cleaning & Facilities",      type: "EXPENSE" },
  { name: "Security",                   type: "EXPENSE" },
  { name: "Other Expense",              type: "EXPENSE" },

  // Both (4)
  { name: "Transfers",                  type: "BOTH" },
  { name: "Foreign Exchange",           type: "BOTH" },
  { name: "Suspense",                   type: "BOTH" },
  { name: "Uncategorised",              type: "BOTH" },
];

/**
 * Returns merged category names for a given transaction type.
 * Custom org categories are merged with predefined defaults,
 * deduped, and sorted alphabetically.
 */
export function getCategoriesForType(
  type: "INCOME" | "EXPENSE",
  customCategories: { name: string; type: CategoryType }[] = []
): string[] {
  const predefined = PREDEFINED_CATEGORIES
    .filter((c) => c.type === type || c.type === "BOTH")
    .map((c) => c.name);

  const custom = customCategories
    .filter((c) => c.type === type || c.type === "BOTH")
    .map((c) => c.name);

  const merged = Array.from(new Set([...predefined, ...custom]));
  return merged.sort((a, b) => a.localeCompare(b));
}
