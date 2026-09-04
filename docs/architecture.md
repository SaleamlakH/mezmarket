# Architecture Document

## Inventory & Sales Management App for Small/Medium Businesses

## Table of Contents

1. [Stack Summary](#1-stack-summary)
2. [High-Level Shape](#2-high-level-shape)
3. [Frontend](#3-frontend)
4. [Backend](#4-backend)
5. [Database & ORM](#5-database--orm)
6. [Auth & Authorization](#6-auth--authorization)
7. [Hosting & Deployment](#7-hosting--deployment)
8. [Cross-Cutting Concerns](#8-cross-cutting-concerns)
9. [What This Doc Deliberately Skips](#9-what-this-doc-deliberately-skips-v1)
10. [Repository Structure](#10-repository-structure)
11. [Open Decisions](#11-open-decisions)

---

---

## 1. Stack Summary

| Layer    | Choice                                                                         |
| -------- | ------------------------------------------------------------------------------ |
| Frontend | React + TypeScript + Tailwind CSS                                              |
| Backend  | Node.js + Express + TypeScript                                                 |
| Database | PostgreSQL                                                                     |
| ORM      | Prisma                                                                         |
| Test     | vitest + react testing library + supertest                                     |
| Auth     | Supabase Auth (auth only, not DB/storage/functions)                            |
| Hosting  | Vercel (frontend) + Render or Railway (backend) + Supabase Postgres (database) |

---

## 2. High-Level Shape

```
[React SPA, mobile-first]
        │  HTTPS / JSON (REST)
        ▼
[Express API — TypeScript]
        │  Prisma Client
        ▼
[PostgreSQL — hosted on Supabase]

Auth: React app ──(Supabase Auth SDK)──> Supabase Auth
                       │ issues JWT
                       ▼
      React app attaches JWT to every API request
                       │
                       ▼
      Express middleware verifies JWT, resolves the
      provider user id via `account_identities` to
      either an `owners` row or a `staff` row
```

A single Express API serving a single-page React app, backed by one Postgres database. No microservices, no queue, no separate mobile app — deliberately simple, matching a solo build and an SMB-scale product.

---

## 3. Frontend

- **React + TypeScript**, built with Vite (fast dev server, simple config — no strong reason for Next.js here since there's no SEO/SSR need; this is a logged-in operational tool, not a marketing site).
- **Tailwind CSS** for styling; mobile-first is a layout discipline, not a separate codebase — design every screen for a narrow viewport first, then adapt up.
- **State/data fetching:** TanStack Query (React Query) for server state (sales, products, containers) — handles caching/refetching without hand-rolled state management. Local UI state via React's own `useState`/`useReducer`; a global store (Zustand/Redux) is likely unnecessary for this app's scope.
- **Forms:** React Hook Form + Zod for validation — Zod schemas can be shared/mirrored with the backend's validation (see §4) to avoid duplicating validation logic conceptually, even if not literally shared as a package initially.
- **Structure:** feature-based, mirroring the API's module boundaries — each domain area owns its own folder of components, hooks, and page-level views:
  ```
  apps/web/src/
    features/
      products/
      batches/
      adjustments/
      containers/
      sales/
      dashboard/
      auth/
    shared/
      components/    (buttons, inputs, layout — truly cross-feature)
      hooks/
    App.tsx
  ```
- **Routing:** React Router.
- **PWA consideration:** since this is "mobile-first web app," not native, add a basic PWA manifest + service worker early (installable icon, works over a flaky connection) — this is cheap now and expensive to retrofit. Full offline support is explicitly out of scope (per PRD non-goals) — this is just "feels like an app," not offline-capable.

---

## 4. Backend

- **Express + TypeScript**, organized by **module (domain), not by layer-type** — each feature area owns its own folder containing its routes, controller, and service together, since this app has clean, stable domain boundaries that map directly onto the eventual epics:
  ```
  apps/api/src/
    modules/
      products/      (products.routes.ts, .controller.ts, .service.ts)
      batches/
      adjustments/
      containers/
      sales/
      identity/    (Owner, Business, Branch, Staff, Actor, AccountIdentity)
      auth/
    shared/
      middleware/
      prisma/
      errors/
    app.ts
  ```
  Within a module: `routes` stay thin (HTTP only), `controller` handles request/response, `service` holds the actual business logic (unit conversion, FIFO lot allocation, Loss lot suggestion, container targeting, batch locking, deviation calc) — this is where the PRD's rules live in code.
- **Validation:** two separate workspaces, shared by `apps/api` and `apps/web`:
  - `packages/types` — plain TypeScript domain/DTO types only (`Product`, `Sale`, `Batch`, `Container`, …), no runtime dependencies. This is the wire contract every part of the system agrees on.
  - `packages/validation` — depends on `packages/types`, builds Zod schemas _against_ those types internally, and exposes only validation-specific surface: `validateX(data: unknown)` functions, plus types relevant to validation itself (`ValidationResult<T>`, `ValidationError`) — never the domain types (those come from `packages/types` directly) and never Zod itself. If the validation library is ever swapped, it's contained entirely to this one package.
- **API style:** REST, resource-oriented (`/products`, `/batches`, `/sales`, `/containers`) with query-string filtering (`/sales?status=pending`) — simplest fit for a solo build with one client.
- **Multi-tenancy enforcement:** every query scoped by `business_id`, derived server-side from the resolved business context (§6) — never trust a `business_id` sent from the client, and never assume it from identity alone since an Owner may operate multiple businesses. Enforce this centrally (e.g. a Prisma middleware or a base repository pattern that always injects the tenant filter) rather than remembering it per query, so a missed filter isn't a silent tenant-isolation bug.
- **Invoices:** generate an HTML invoice view server-side (or client-rendered from sale data) that's shareable via link; PDF export via a library like `pdf-lib` or Puppeteer if a downloadable file is needed — recommend starting with the shareable-link version only, since it's much simpler, and adding PDF export later if actually requested.

---

## 5. Database & ORM

- **Postgres**, hosted on **Supabase's managed Postgres** — reusing the same Supabase project you're already using for Auth avoids standing up a second infra provider, and Prisma connects to it like any other Postgres instance (direct connection string, bypassing Supabase's client library for data access — Supabase is used for Auth only, as you specified).
- **Prisma** owns schema/migrations. Supabase's own dashboard/tools for the DB are avoided for schema changes to prevent drift — Prisma migrations are the single source of truth.
- **Unit references:** every transactable unit a product has lives as one row in a single `ProductUnit` table (Base Unit, MOU, explicitly-added same-dimension Standard Units, and custom units like `shot` are all just rows there, distinguished by a `unitRole` enum). This means `StockBatchLine`, `SaleLine`, and `Loss` each need only **one** FK — `productUnitId` — rather than a polymorphic reference across multiple unit tables. Whether a row's `standardUnitId` should be null (for a `CUSTOM` row) or set (for `BASE`/`MOU`/`STANDARD`) is validated at the application layer, not via a database CHECK constraint — Prisma's schema DSL has no native way to express that conditional rule, and application-layer validation keeps this consistent with how every other business rule in the system is enforced.
- **Actor references:** every action-recording table (`StockBatch`, `Container`, `Sale`, `Loss`, `Payment`, `AuditLog`) references a single `Actor` supertype rather than a nullable Owner/Staff pair — `Actor` itself holds the nullable `ownerId`/`staffId` pair (exactly one non-null, application-validated), so everything downstream of it only needs one FK.
- **Migrations:** `prisma migrate dev` locally, `prisma migrate deploy` in CI/deploy step — never hand-edit the production schema.

---

## 6. Auth & Authorization

- **Supabase Auth** handles signup/login/session/JWT issuance for **Owners only**, at this stage — no reliance on Supabase's database, storage, or edge functions. Staff login is not yet designed; `Staff` currently has no credential fields at all, and this section will be revisited once that's built out.
- **Identity is decoupled from the auth provider via `AccountIdentity`** (schema §1) — the provider's user id is stored in exactly one place, linked to an `Owner`, never embedded directly in business-logic tables. If the auth provider ever changes, only `AccountIdentity` is affected.
- **Signup:** the only self-service signup in the app. Completing signup creates a Supabase identity, an `Owner` row, an `AccountIdentity` link, and the Owner's first `Business` (with its auto-created `main` `Branch`), together.
- **`Actor` as the acting-identity supertype:** every action-recording table (`StockBatch`, `Container`, `Sale`, `Loss`, `Payment`, `AuditLog`) references a single `Actor` row rather than an Owner or Staff directly. Once Staff login exists, an authenticated request resolves to either an `Owner`'s `Actor` or a `Staff` member's `Actor` — everything downstream of that point (permission checks, audit trail, "who did this") only ever deals with one `Actor` id, regardless of which kind of identity is behind it.
- **Every API request** carries the JWT; Express middleware verifies it, extracts the provider user id, and resolves it through `AccountIdentity` to an `Owner`, then to that Owner's `Actor`.
- **Business context resolution:** since one Owner can operate multiple Businesses, the active business for a request can't be inferred from identity alone — it must be explicit (e.g. a selected-business id in a header or route), validated against the Owner's actual businesses server-side.
- **Authorization:** role-based checks in the service layer (`requireRole(['manager'])`, or "must be the resolved business's Owner") rather than a full permissions framework — matches the PRD's flat model. Roles are a fixed enum (`manager`/`cashier`/`server`), not a configurable permissions system.
- **Branch** exists in the data model (every business gets one auto-created `main` branch), but there is no branch-switching or multi-branch UI to authorize against yet — every request's tenant scoping is effectively business-level.

---

## 7. Hosting & Deployment

- **Frontend:** Vercel — connects to GitHub, auto-deploys on push, generous free tier, trivial preview deployments per PR (useful even solo, for testing before merging to main).
- **Backend:** Render or Railway — both support a long-running Express process (Vercel's serverless functions are a worse fit for a persistent Express app with Prisma connection pooling). Pick either; Render has a slightly simpler pricing model, Railway a slightly nicer DX — low-stakes choice, don't over-deliberate it.
- **Database:** Supabase Postgres (already provisioned for Auth) — one connection string, one dashboard, one bill.
- **Environments:** at minimum `production` and one `staging`/preview setup; Vercel gives preview URLs per branch for free, Render/Railway both support a second low-cost service for staging.
- **Secrets:** environment variables per platform (Supabase keys, DB connection string, JWT verification keys) — never committed; use `.env.example` in the repo to document what's required without exposing values.

---

## 8. Cross-Cutting Concerns

- **Audit log (`audit_log` table from schema):** written from the service layer at the point of the action (batch confirm, sale void, container close, adjustment) — not reconstructed later from other tables.
- **Error handling:** centralized Express error-handling middleware, consistent JSON error shape (`{ error: { code, message } }`) so the frontend can handle failures uniformly.
- **Testing:** automated tests are required (not optional), with CI already wired up on push (Render + Vercel deploy pipelines running tests). Recommend **Vitest** (fast, native TS/ESM support, works cleanly across a pnpm monorepo) for both unit and integration tests, plus **Supertest** for API endpoint integration tests. Priority order given solo bandwidth:
  1. Unit tests for the service layer — unit conversion, FIFO lot allocation across StockBatchLines, Loss's default-lot suggestion, container targeting/deviation calc, batch locking, the direct-override-edit permission/audit path — this is where the PRD's trickiest rules live and where a silent bug shows up as _wrong stock numbers_, not a crash.
  2. Integration tests for API endpoints that mutate stock (batch confirm, sale creation, container close, adjustments) — verifying the DB ends up in the right state, not just that the HTTP call succeeds.
  3. Frontend component/unit tests as time allows — lower priority than the two above for this app's risk profile.
- **Backups:** rely on Supabase's built-in Postgres backups initially; confirm retention window is acceptable, revisit if not.

---

## 9. What This Doc Deliberately Skips (v1)

- Formal API versioning — single client (your own frontend) means breaking changes can ship in lockstep; revisit if a public API or third-party integrations appear later.
- Rate limiting / abuse protection — add before any public-facing signup flow goes live, not required for early solo development.
- Detailed monitoring/alerting stack — Render/Railway/Vercel's built-in dashboards are enough at this stage.

---

## 10. Repository Structure

Monorepo, managed with **pnpm workspaces**. Full tree:

```
/
  apps/
    web/
      src/
        features/
          products/
          batches/
          adjustments/
          containers/
          sales/
          dashboard/
          auth/
        shared/
          components/
          hooks/
        App.tsx
      package.json          (name: "web")
      vite.config.ts
    api/
      prisma/
        schema.prisma
        seed.ts
      src/
        db/
          client.ts          (exports a configured PrismaClient singleton)
        modules/
          products/
          batches/
          adjustments/
          containers/
          sales/
          identity/    (Owner, Business, Branch, Staff, Actor, AccountIdentity)
          auth/
        shared/
          middleware/
          errors/
        app.ts
      package.json          (name: "api", "prisma": { "seed": "tsx prisma/seed.ts" })
  packages/
    types/
      src/
        product.ts
        batch.ts
        sale.ts
        container.ts
        user.ts
        index.ts             (re-exports everything)
      package.json           (name: "@app/types")
    validation/
      src/
        products/
          schema.ts           (internal Zod, imports types from @app/types)
          index.ts             (exports validateCreateProduct, etc.)
        common/
          result.ts            (ValidationResult<T>, ValidationError)
        index.ts
      package.json           (name: "@app/validation", deps: zod, @app/types)
    config/
      eslint/
      tsconfig.base.json
      package.json           (name: "@app/config")
  pnpm-workspace.yaml
  package.json                (root — scripts, dev tooling)
```

Prisma (schema, migrations, seed script, generated client) lives entirely inside `apps/api` rather than as its own package `packages/types` and `packages/validation` earn their place as separate packages because both `apps/web` and `apps/api` genuinely import them at runtime; nothing else in the repo currently clears that bar. Migrations, seeding, and client generation are run directly against the API package: `pnpm --filter api exec prisma migrate dev`, `pnpm --filter api exec prisma db seed`, `pnpm --filter api exec prisma generate`.
