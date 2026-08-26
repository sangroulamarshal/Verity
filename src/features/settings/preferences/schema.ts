import { z } from "zod";

// "Default dashboard period" from the brief's example list is
// deliberately not included — the dashboard has no period selector to
// apply it to yet (it always shows the last 6 months), and a stored
// preference with no effect on anything would be a dead control. Only
// preferences that actually change something in the app are offered.
export const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
export const DEFAULT_TRANSACTION_VIEWS = ["ALL", "INCOME", "EXPENSE"] as const;

export const preferencesSchema = z.object({
  dateFormat: z.enum(DATE_FORMATS),
  defaultTransactionView: z.enum(DEFAULT_TRANSACTION_VIEWS),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  dateFormat: "DD/MM/YYYY",
  defaultTransactionView: "ALL",
};
