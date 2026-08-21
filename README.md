# Verity

Financial clarity you can trust.

Verity is a financial intelligence platform for small and medium-sized
businesses: normalized transactions, a financial customer CRM, explainable
risk & anomaly detection, and simple cash-flow forecasting. See
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the layering rules and
the security model this is built around.

Built in phases — see the status list on the home page, or the table below.

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation | ✅ Done |
| 2 | Authentication | ✅ Done |
| 3 | Transactions + manual entry | Pending |
| 4 | CSV/Excel import + normalization | Pending |
| 5 | Customer CRM | Pending |
| 6 | Risk & anomaly engine | Pending |
| 7 | Cash-flow forecasting | Pending |
| 8 | Dashboard integration | Pending |
| 9 | Security hardening | Pending |
| 10 | Testing + UI polish | Pending |

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) ·
Tailwind CSS v4 · hand-authored shadcn/ui-style primitives · Drizzle ORM ·
PostgreSQL · Zod · Vitest + Testing Library · Playwright.

## Getting started

Prerequisites: Node.js 20.9+, a PostgreSQL 16+ database.

```bash
npm install
cp .env.example .env
# edit .env — set DATABASE_URL to a real Postgres connection string
npm run dev
```

Open <http://localhost:3000>.

The first time you run `npm run dev` or `npm run build`, Next.js also
generates route-typing helpers (`LayoutProps`, `PageProps`, ...) into
`.next/types`. If you run `npm run typecheck` before ever running `dev` or
`build`, run `npx next typegen` once first.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:watch` | Unit tests, watch mode |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:push` | Push schema changes straight to the database (dev only) |
| `npm run db:studio` | Open Drizzle Studio |

## A note on shadcn/ui

`src/components/ui/*` was hand-authored rather than pulled via
`npx shadcn add`, because the shadcn registry (`ui.shadcn.com`) wasn't
reachable from the sandbox this was built in. The components match the
standard "new-york" style output. If you have registry access, running
`npx shadcn@latest diff` is a reasonable one-time check that nothing
drifted, though it shouldn't have.

## Security

Read [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) before adding a table
or a route — in particular, every table holding financial data must carry
an `organizationId` foreign key, and every query against it must be scoped
by the authenticated session's organization, never by a bare ID from the
request. This is the single most important invariant in the codebase.
