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

// Appearance (theme) is a genuinely separate preference from the two
// above: it's set from two different places (the header ThemeToggle and
// this page's AppearanceControl), and next-themes needs it to apply
// instantly client-side, whereas dateFormat/defaultTransactionView only
// take effect on the next server render. Kept as its own schema/action
// (setThemeAction, in ./actions) rather than folded into
// preferencesSchema/updatePreferencesAction — see the comment there for
// why: bundling it into the same schema would make theme a required
// field on every future preferencesSchema.safeParse(formData) call, and
// FormData.get() of a field the form doesn't render comes back as a
// bare `null`, which is exactly the class of bug documented in
// features/transactions/actions.ts's presetId fix.
export const THEMES = ["light", "dark", "system"] as const;
export const themeSchema = z.enum(THEMES);
export type Theme = z.infer<typeof themeSchema>;
export const DEFAULT_THEME: Theme = "system";
