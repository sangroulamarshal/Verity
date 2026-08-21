# server/services

Org-scoped data access and orchestration. Every function here that touches
the database takes an `organizationId` and uses it in the query — never
trusts a bare record ID from a route or action.

This layer may import from `db/` and `types/`. It must not import from
`app/` or `components/`. Populated starting Phase 2 (auth/session service).
