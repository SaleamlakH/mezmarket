# MezMarket

Mobile-first inventory and sales tracking for small shops and traders. MezMarket handles products sold by the piece as well as products measured, poured, sliced, or weighed, with per-unit pricing and FIFO lot costing.

[![CI](https://github.com/SaleamlakH/mezmarket/actions/workflows/ci.yaml/badge.svg)](https://github.com/SaleamlakH/mezmarket/actions/workflows/ci.yaml)
[![API version](https://img.shields.io/github/v/tag/SaleamlakH/mezmarket?filter=api%40*&sort=semver&label=api%20version)](https://github.com/SaleamlakH/mezmarket/releases)
[![Web version](https://img.shields.io/github/v/tag/SaleamlakH/mezmarket?filter=web%40*&sort=semver&label=web%20version)](https://github.com/SaleamlakH/mezmarket/releases)

> **Status:** active development, pre-1.0. The features below are what works in this repository today; the roadmap lists the rest.

## Why MezMarket

- **Flexible units.** A product can be sold by its base unit, a measurable content unit, or a custom unit such as a shot or a slice.
- **Accurate costs.** Purchases are tracked as lots, and sales draw stock oldest-first using FIFO, freezing each lot's cost at the moment of sale.
- **Fast selling.** The sale screen is built for a phone: pick products, choose a unit, set a quantity, and confirm.
- **Shop-level visibility.** See sales, cash collected, outstanding balances, gross profit, payment methods, stock alerts, and member performance.

## What works today

### Accounts and business

- Email/password sign-up and sign-in through Supabase Auth.
- Owner profile with display name, contact email, and contact phone.
- One owner can own multiple businesses; business records are resolved per request.
- Creating a business also creates its `main` branch and the owner's `OWNER` membership.
- Business settings for name, currency, default tax rate, tax-on-sales, negative-stock policy, and low-stock threshold.
- Fixed member roles (`OWNER`, `MANAGER`, `CASHIER`, `SERVER`) with role gates on write endpoints. Sign-in is currently owner-only.

### Catalog

- Products with brand, description, image, low-stock threshold, and active/inactive state.
- Base unit, one optional content/MOU unit, and custom units with an explicit factor.
- Automatic conversion between units of the same dimension from the platform unit set.
- Independent pricing per transactable unit, with purchase and sell flags.
- Product image upload through signed storage links.

### Inventory

- Batches with date, optional supplier and reference number, and multiple product lines.
- Per-line purchase unit, quantity, unit cost, and optional expiry date.
- Each line records both the unit as entered and its resolved standard-unit quantity.
- FIFO lot tracking for remaining stock and cost.
- Product stock views with low/out-of-stock and expiry filters.
- Batch history and batch detail views.

### Sales

- Mobile sale builder with multiple products, units, and quantities.
- In-memory cart that survives navigation until checkout or reload.
- Whole-sale discounts and the business's tax rate.
- Paid, pending, and partially paid sales with multiple recorded payments.
- Payment methods for cash, card, bank transfer, mobile money, and other.
- Optional customer attribution.
- Sale history with status, date, payment-date, product, unpaid, and overdue filters.
- Sale detail with payment recording and FIFO cost allocation.

### Dashboard

- Today, last 7 days, month, and custom period selection.
- Sales total, cash collected, outstanding balance, and gross profit for managers.
- Needs-attention cards for low/out-of-stock products, expiring lots, and unpaid sales.
- Signed-in member performance for the selected period.
- Payment-method breakdown.
- Gross-profit trend by hour or day.

### Customers and team

- Create and list customers, then attach one to a sale.
- Read-only member directory with role filters.
- Member performance reads for the dashboard and member management.

### Platform

- REST API with business- and branch-scoped data access.
- Shared TypeScript types and Zod validation used by the API and web app.
- Structured JSON error envelope.
- Product-image uploads using signed storage links.
- Unit and integration tests for API modules and web features.
- GitHub Actions CI plus changeset-based releases and deployments.

## Not implemented yet

These are planned additions, not current behavior.

| Area | Today | Planned |
| --- | --- | --- |
| Partial containers | Schema only | Open a sealed unit, sell from open containers, close and record deviation, choose the display unit |
| Losses | Schema and dashboard read support only | Record damage or expiry against a lot, with a suggested lot and reasons |
| Audit trail | Schema only | Write audit entries for stock, sale, payment, and override actions; owner/manager viewer |
| Batch management | Create, list, and detail only | Draft batches, edit confirmed batches, direct line override with a required reason |
| Sale lifecycle | Create, read, and record payments | Edit, void, refund with per-line restock choice, shareable and printable invoice |
| Staff accounts | Owner sign-in only; read-only member directory | Create staff records, issue credentials or invites, manage roles and server profiles |
| Business and branches | Multiple businesses per owner in the API; one `main` branch | Business switcher and branch management |
| Catalog refinements | Create and edit products and units; names editable, conversion facts locked | Edit or remove custom units and conversion facts, multiple MOUs per product, categories, unit templates |
| Commerce settings | One currency and one business-level tax rate | Per-product tax classes and multi-currency |
| Reporting | Dashboard summary, trend, payment methods, and member performance | Apply the business low-stock default, loss and container reporting, customer balances, richer reports and exports |
| Platform hardening | Unpaginated lists; manual migrations; signed uploads | Pagination, upload validation and cleanup, rate limiting, automated migrations, monitoring, API versioning |

## Tech stack

| Layer | Technology |
| --- | --- |
| Web | React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Hook Form, Zod |
| API | Node.js, Express 5, TypeScript |
| Database | PostgreSQL, Prisma 7 |
| Auth and files | Supabase Auth, Supabase Storage |
| Shared packages | `@mez/types`, `@mez/validation` |
| Tooling | pnpm workspaces, Turborepo, ESLint, Prettier, Husky, lint-staged |
| Tests | Vitest, React Testing Library, Supertest |
| Deployment | Render (API), Vercel (web), Supabase PostgreSQL |

## Repository layout

```text
apps/
  api/                 Express API, Prisma schema, migrations, and seed
  web/                 React single-page app
packages/
  types/               Shared domain and API types
  validation/          Shared Zod validation schemas
docs/                  Product, architecture, schema, feature, and deployment docs
scripts/               CI and deployment helpers
```

## Getting started

### Prerequisites

- Node.js 24
- pnpm 11.9
- A PostgreSQL database
- A Supabase project for Auth, plus Storage if product images are needed

### Setup

```bash
pnpm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

pnpm db:migrate
pnpm db:seed
pnpm dev
```

The API listens on port `3000` by default, and the web app runs through Vite. Open the web app, sign up, and create your first business.

For local API routing, set `VITE_API_PROXY=http://localhost:3000` in `apps/web/.env`. In production, set `VITE_API_URL` to the deployed API origin instead.

### Environment variables

#### API

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `SUPABASE_JWKS_URL` | Yes | Supabase JWKS endpoint used to verify access tokens |
| `CORS_ORIGINS` | Yes | Comma-separated allowed web origins |
| `PORT` | No | API port; defaults to `3000` |
| `SUPABASE_URL` | For images | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | For images | Service-role key used to sign upload and download links |
| `STORAGE_BUCKET` | For images | Storage bucket for product images |

#### Web

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL for the browser client |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key for the browser client |
| `VITE_API_URL` | In production | Public API origin |
| `VITE_API_PROXY` | Local only | Dev-server proxy target for `/api` requests |

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the API and web app in development |
| `pnpm build` | Build every workspace package |
| `pnpm lint` | Lint and fix |
| `pnpm lint:check` | Lint without fixing |
| `pnpm format` | Format with Prettier |
| `pnpm format:check` | Check formatting |
| `pnpm typecheck` | Type-check every workspace package |
| `pnpm test` | Run the test suites |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm db:migrate` | Create and apply a development migration |
| `pnpm db:deploy` | Apply pending migrations |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed platform dimensions and standard units |

## Testing and checks

Run the same checks locally before opening a pull request:

```bash
pnpm format:check
pnpm lint:check
pnpm typecheck
pnpm test
pnpm build
```

## Deployment and releases

The API deploys to Render, the web app to Vercel, and PostgreSQL, Auth, and Storage live in Supabase.

- GitHub Actions runs format, lint, typecheck, test, and build checks on pull requests and `main`.
- Changesets drive versioning and tags.
- Tagged releases trigger the deployment workflows.
- Database migrations are applied separately with `pnpm db:deploy`.

See [workflows.md](docs/workflows.md) and [deployment.md](docs/deployment.md) for the full setup.

## Documentation

| Document | Contents |
| --- | --- |
| [PRD](docs/prd.md) | Product requirements, roles, rules, and phasing |
| [Architecture](docs/architecture.md) | Stack, system shape, and module boundaries |
| [Data schema](docs/schema.md) | Tables, relationships, and design notes |
| [Unit system](docs/unit-system-architecture.md) | Base, content, and custom units; conversion rules |
| [File transfer](docs/file-transfer-architecture.md) | Signed upload and download flow |
| [Features](docs/features/) | Auth, business, products, inventory, sales, customers, members, dashboard, uploads, and errors |
| [Workflows](docs/workflows.md) | CI, release, and deployment workflows |
| [Deployment](docs/deployment.md) | Render, Vercel, and database migration setup |

## Contributing

- Keep changes scoped and use the shared types and validation packages for API contracts.
- Add or update tests with behavior changes.
- Add a changeset with `pnpm changeset` for user-facing changes.
- Run the checks above before opening a pull request.

## License

GNU Affero General Public License v3.0 only. See [`LICENSE`](LICENSE).
