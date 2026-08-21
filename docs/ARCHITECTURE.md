# Verity — Architecture Notes

Modular monolith on Next.js App Router. No separate backend service.

## Layering rule

```
app/            UI — Server Components by default, Client Components only
                where interactive. Calls into features/*/actions.ts or
                server/services directly. No business logic lives here.

features/*/     Feature-local components, Server Actions, Zod schemas.
                Composes server/services. No cross-feature imports.

server/services Org-scoped data access + orchestration. Every query is
                parameterized by organizationId. May import db/, types/.

server/engines  Pure domain logic (normalization, risk, cash flow). No
                framework imports, no DB access, no HTTP. Takes canonical
                data in, returns plain data out. This is what's tested
                with Vitest in isolation.

db/             Drizzle schema + client. Migrations only — never hand-edit
                the production schema directly.
```

`server/engines` must never import from `app/` or `components/`, and must
never receive raw CSV/XLSX rows — only canonical `Transaction` objects
produced by the normalization engine. This is what makes "the system must
not depend on the original source format after normalization" a real,
enforced boundary rather than a design aspiration.

## The one security rule that matters most

Every table that stores financial data has an `organizationId` foreign key.
Every query against those tables filters on it, sourced from the
authenticated session — never from a route parameter, request body, or
client-supplied ID. A user must never be able to reach another
organization's data by changing an ID.

This is checked by an explicit `assertOwnedByOrg()`-style helper (added in
Phase 2 alongside auth), used at every service boundary — not re-derived
ad hoc per route.

## What Phase 1 set up

- Next.js 16 App Router, TypeScript strict mode, Tailwind v4 (CSS-first
  config), hand-authored shadcn/ui-style primitives (see note below).
- Drizzle ORM wired to Postgres via `pg`, with an empty schema barrel —
  no entity tables yet. Those start in Phase 2.
- Dark/light/system theme via `next-themes`, class-based strategy.
- Vitest (unit) + Playwright (e2e) harnesses, each with one smoke test,
  and a GitHub Actions workflow running lint, typecheck, and both.

## Note on shadcn/ui components

The `shadcn` CLI registry (`ui.shadcn.com`) wasn't reachable from the build
sandbox this was assembled in, so `components.json` and everything under
`src/components/ui/` were hand-authored to match the standard shadcn/ui
"new-york" style output rather than pulled live via `npx shadcn add`. If you
have registry access in your own environment, `npx shadcn@latest diff` can
tell you if these have drifted from upstream — they shouldn't have, since
they were written to match it directly, but worth checking once.

## What Phase 2 added

- **Schema**: `organizations`, `users` (unique `organizationId` — one user
  per org for the MVP; there's no team-invite flow, so this is enforced at
  the DB level, not just assumed), `sessions` (stores a SHA-256 hash of the
  session token, never the raw token), `audit_logs` (nullable org/user so a
  failed login with an unknown email can still be recorded).
- **Password hashing**: Argon2id via `@node-rs/argon2`, OWASP-recommended
  parameters made explicit in `lib/password.ts` rather than left as
  library defaults that could silently change.
- **Sessions — two-tier check**, following Next.js's own bundled
  authentication guide precisely:
  - `proxy.ts` does an **optimistic** check only (cookie presence, no DB
    call) and redirects for UX speed. Next's own docs are explicit that
    Proxy must not be the sole authorization boundary.
  - `server/services/session.ts`'s `verifySession()` is the **authoritative**
    check — always hits the database, wrapped in React's `cache()` so one
    render pass only queries once. Every protected Server Component,
    Server Action, and Route Handler must call this, not just rely on the
    proxy having let the request through.
  - This split is also what makes sessions actually revocable: deleting a
    `sessions` row invalidates it immediately, even though the browser's
    cookie hasn't "expired" from the browser's own point of view.
- **Login hardening**: generic "Invalid email or password" (deliberately
  not "wrong password" vs. "no such user", to avoid confirming which
  emails are registered) with a timing-safety dummy-hash comparison so a
  non-existent email doesn't respond measurably faster than a real one;
  rate limiting keyed by both IP and normalized email. Registration, by
  contrast, does say "already registered" directly — registration is a
  natural enumeration vector regardless, and the UX cost of a vague error
  there isn't worth it.
- **Audit logging**: `USER_REGISTERED`, `LOGIN_SUCCEEDED`, `LOGIN_FAILED`,
  `LOGOUT`, all wrapped so a logging failure can never block a real
  login/registration — see `auditLogSafely` in `features/auth/actions.ts`.

All of the above was verified against a real local PostgreSQL instance,
not just unit tests: registration, wrong-password rejection, correct
login, protected-route access, the proxy's redirect for anonymous
requests, logout (and that it only deletes the current session), duplicate
email rejection, and weak-password rejection were each exercised as real
HTTP requests against the running app and confirmed against actual
database rows.

## What Phase 3 added

- **Schema**: `transactions` — `organizationId` FK, `date` (calendar date,
  no time — matches what CSV/bank exports actually provide), `amount`
  (`numeric(14,2)`, stored and passed around as a **string**, not a JS
  number, so no floating-point rounding is ever introduced between form
  input, storage, and display — parsed to a number only at the point of
  display or a future statistical calculation), `currency` (3-letter code,
  format-checked only, not validated against a real ISO 4217 list),
  `type` (`INCOME`/`EXPENSE` pgEnum), `category` (free text — the brief
  doesn't define a fixed taxonomy, so none is invented here), optional
  `description`/`referenceId`, and `source`/`sourceRecordId` (only
  `MANUAL` is ever written this phase; `CSV`/`EXCEL` are reserved for
  Phase 4's importer so the column doesn't need a later migration).
- **`customerId` is deliberately not on this table yet.** The brief's
  canonical Transaction model includes one, but `customers` doesn't exist
  until Phase 5 — there's nothing to reference. Phase 5 adds it as a
  proper FK via a migration once the table it points to actually exists,
  rather than this phase inventing an un-constrained placeholder column
  that would violate "every table holding financial data uses foreign
  keys."
- **Org-scoping**: every read and write in `server/services/transactions.ts`
  takes `organizationId` as an explicit parameter (sourced from
  `verifySession()`, never a route param) and puts it directly in the
  query's `WHERE` clause — including `UPDATE`/`DELETE`, not just `SELECT`.
  This is a stronger pattern than "fetch the row, then check its org and
  reject if it doesn't match": there's no in-between step where a
  cross-organization row is ever loaded, so there's nothing to forget to
  check. A mismatched id simply matches zero rows and the caller gets a
  generic "not found" — deliberately not distinguishing "doesn't exist"
  from "belongs to someone else," same rationale as login's generic
  "Invalid email or password."
- **Testing split**: Vitest covers pure logic only — the Zod schema
  (amount/date/currency edge cases) and the currency/date formatting
  helpers — with no database dependency, consistent with the existing
  suite and with CI's ordering (unit tests run *before* `db:push`, so a
  DB-dependent Vitest test would never have one available). The
  org-scoping/authorization behavior itself (cross-organization reads,
  updates, and deletes all correctly rejected) was verified directly
  against a real local Postgres instance, the same way Phase 2's
  auth/session logic was — not just asserted by inspection. Real
  browser-driven flows (create/edit/delete a transaction, and one
  organization never seeing another's data) are covered by
  `e2e/transactions.spec.ts` and run in CI, which has Chromium available;
  they were not — and cannot currently be — executed from this build
  sandbox, since its network egress doesn't allow downloading Playwright's
  browser binaries (the same category of restriction already noted below
  for the shadcn registry).
- **New UI primitives**: `Dialog` (Radix-based — the one new dependency
  this phase, `@radix-ui/react-dialog`, justified because building an
  accessible modal with proper focus trapping by hand is real work Radix
  already solves correctly), `Textarea` and `Table` (hand-styled native
  elements, no new dependency), and `Select` — deliberately **not**
  Radix's Select. A 2–3 option INCOME/EXPENSE or currency picker doesn't
  need Radix's positioning/viewport machinery; a styled native `<select>`
  is fully accessible and needs nothing extra. Worth revisiting once
  Phase 5's customer picker needs a searchable list.

## Reference repos consulted


- **m4k00/openledger** (MIT) — Drizzle schema conventions (uuid PKs, pgEnum,
  `numeric(precision, scale)` for money, relations helpers) informed the
  schema patterns that Phase 2+ will follow, adapted to add
  `organizationId` everywhere. Its CSV import pipeline (papaparse +
  preview/mapping/commit) is the reference for Phase 4, adapted to add the
  invalid-row/duplicate-candidate reporting Verity's brief requires that
  openledger's simpler version doesn't have.
- **clau1902/finance-tracker** (no LICENSE file found — referenced for
  *pattern*, not copied) — the rate-limiter shape, requireAuth/CSRF-origin
  helper pattern, conditional-SSL Postgres pool, and Zod schema/password
  policy conventions in this codebase were independently written after
  reading that repo's approach, not copy-pasted from it.
