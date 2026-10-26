# Architecture

MezMarket is a pnpm workspace managed with Turborepo. It contains a React
single-page application, an Express REST API, one PostgreSQL database, and two
shared TypeScript packages.

This document describes the system as it is currently built: where code lives,
how requests move through it, and which rules keep the boundaries intact.
Planned product work is tracked in the [README roadmap](../README.md), not here.

## Contents

1. [System shape](#1-system-shape)
2. [Repository map](#2-repository-map)
3. [Web application](#3-web-application)
4. [API application](#4-api-application)
5. [Shared packages](#5-shared-packages)
6. [Data and persistence](#6-data-and-persistence)
7. [Authentication and tenancy](#7-authentication-and-tenancy)
8. [Cross-cutting concerns](#8-cross-cutting-concerns)
9. [Engineering rules](#9-engineering-rules)
10. [Testing](#10-testing)
11. [Deployment](#11-deployment)
12. [Related documentation](#12-related-documentation)

## 1. System shape

| Layer           | Technology                                                               |
| --------------- | ------------------------------------------------------------------------ |
| Web             | React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, React Router |
| API             | Node.js, Express 5, TypeScript                                           |
| Database        | PostgreSQL, Prisma 7                                                     |
| Authentication  | Supabase Auth with JWT verification over JWKS                            |
| File storage    | Supabase Storage through server-issued signed URLs                       |
| Shared packages | `@mez/types`, `@mez/validation`                                          |
| Tests           | Vitest, React Testing Library, Supertest                                 |
| Tooling         | pnpm, Turborepo, ESLint, Prettier, Husky, Changesets                     |
| Deployment      | Vercel for web, Render for API, Supabase for Postgres, Auth, and Storage |

```text
Browser
  React SPA
    |  HTTPS JSON + Bearer token
    v
Express API
  |  Prisma Client
  v
PostgreSQL

External services:
  Supabase Auth     issues and verifies owner identity
  Supabase Storage  receives uploads and serves downloads through signed URLs
```

The system is a modular monolith. There are no separate services, queues, or
mobile applications. The web app and API are deployed independently, but they
share contracts from the same workspace.

## 2. Repository map

```text
/
  apps/
    api/
      generated/prisma/       Build artifact for Prisma Client; never edited
      prisma/                 Schema, migrations, and seed data
      src/                    API source and tests
    web/
      src/                    React application
      tests/                  Global test setup
  packages/
    types/                    Shared API and domain contracts
    validation/               Shared Zod schemas and validators
  docs/                       Product, architecture, feature, and operations docs
  scripts/ci/                 Deployment helper scripts
  .changeset/                 Versioning configuration
  .github/workflows/          CI, release, and deployment workflows
```

Applications may import the shared packages. The packages never import from
either application.

## 3. Web application

### Directory model

```text
apps/web/src/
  components/                 Reusable presentational primitives
  config/                     Browser environment access
  features/                   Feature-owned code
  hooks/                      Cross-feature data and UI hooks
  layouts/                    App shell, navigation, route guards
  lib/                        API client, Supabase, formatting, caches
  pages/                      App-level fallback pages
  providers/                  App-wide context and cross-feature ports
  router/                     Route table and lazy page imports
  styles/                     Tailwind entry points and design tokens
  App.tsx                     Root composition of providers and Router
  main.tsx                    React bootstrap
  DesignSystem.tsx            Development-only component gallery
```

The global directories are not a general-purpose `shared` folder. Each has a
specific job:

| Directory    | Responsibility                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `components` | Generic, feature-agnostic UI primitives such as buttons, fields, dialogs, cards, and page shells.                               |
| `config`     | Typed access to browser environment variables.                                                                                  |
| `hooks`      | Hooks that read data used by more than one feature, such as catalog, customers, and members.                                    |
| `layouts`    | App chrome, navigation, route guards, and registration layout.                                                                  |
| `lib`        | Infrastructure and pure helpers with no feature ownership: API client, Supabase client, query policy, formatting, image caches. |
| `pages`      | Only app-level fallback screens. Product screens belong to a feature.                                                           |
| `providers`  | App-wide providers and the ports through which features expose data to other features.                                          |
| `router`     | Browser router, route tree, suspense wrappers, and lazy imports.                                                                |
| `styles`     | Global CSS and design tokens.                                                                                                   |

### Features

A feature is a vertical slice with a single domain owner. It may contain any of
the following folders, created only when the feature needs them:

```text
features/<feature>/
  api/            HTTP service adapters and their tests
  components/     Feature-specific UI
  context/        Feature-scoped context, provider, and hooks
  fixtures/       Development-only data and preview controls
  hooks/          Data, form, and view-model hooks
  lib/            Pure feature helpers and calculations
  pages/          Route-entry screens
  state/          Reducers and providers for feature state
  __tests__/      Feature-wide fixtures and tests
```

Not every feature needs every folder. A small feature may contain only `api`;
a larger one may use all of them.

| Feature         | Owns                                                                 | Folders in use                                                      |
| --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `auth`          | Supabase auth adapter, login, and signup                             | `api`, `hooks`, `pages`                                             |
| `business`      | Business creation, business profile, and the business API adapter    | `api`, `components`, `hooks`, `pages`                               |
| `customers`     | Customer list and create adapter used by the sale flow               | `api`                                                               |
| `dashboard`     | Dashboard reads, period filtering, charts, and development previews  | `api`, `components`, `context`, `fixtures`, `hooks`, `lib`, `pages` |
| `inventory`     | Batch intake, stock views, batch history, and inventory filters      | `api`, `components`, `context`, `hooks`, `lib`, `pages`             |
| `members`       | Member directory API adapter                                         | `api`                                                               |
| `owner-profile` | Owner profile read, edit, and page                                   | `api`, `components`, `hooks`, `pages`                               |
| `products`      | Product catalog, units, images, and product screens                  | `api`, `components`, `hooks`, `pages`                               |
| `sales`         | Sale builder, sale history, sale detail, draft state, and payment UI | `api`, `components`, `hooks`, `lib`, `pages`, `state`               |
| `settings`      | Settings navigation shell                                            | `pages`                                                             |

Test folders are omitted from the table. Tests live beside the code they cover.

### Composition and cross-feature ports

`App.tsx` is the web composition root. It creates the concrete service
instances and wires the app-wide providers:

```text
QueryClientProvider
  AuthProvider              authService
    CatalogProvider         productsService
      CustomersProvider     customersService
        MembersProvider     membersService
          BusinessProvider  businessService, current user
            ThemeProvider
              RouterProvider
```

Feature-scoped providers are mounted by the router shell instead, because their
state only applies to an authenticated business screen:

- `SaleDraftProvider` keeps the in-memory sale cart.
- `DashboardPeriodProvider` keeps the selected reporting period.
- `InventoryFilterProvider` keeps inventory filters across navigation.

Features do not import each other. When one feature needs data owned by
another, the owner exposes a narrow port:

1. The consumer-facing interface lives in `providers/<port>/types.ts`.
2. The owning feature implements that interface in its `api` folder.
3. `App.tsx` injects the implementation into the provider.
4. A hook in the global `hooks` folder reads the service from the port context.

| Provider    | Port               | Implemented by                               | Used for                                                    |
| ----------- | ------------------ | -------------------------------------------- | ----------------------------------------------------------- |
| `business`  | `BusinessService`  | `features/business/api/businessService.ts`   | Current business, business list, create, and update         |
| `catalog`   | `CatalogService`   | `features/products/api/productsService.ts`   | Product and unit reference data used by sales and inventory |
| `customers` | `CustomersService` | `features/customers/api/customersService.ts` | Customer picker in the sale flow                            |
| `members`   | `MembersService`   | `features/members/api/membersService.ts`     | Member pickers and member-facing reads                      |

`AuthProvider` consumes the `AuthService` contract from `@mez/types` and the
Supabase adapter from the auth feature. `ThemeProvider` is app chrome and has no
domain port.

This pattern keeps the dependency graph acyclic. A feature can be changed or
removed without requiring edits inside unrelated features.

### Routing

`router/index.tsx` owns the route tree. It composes:

- `ProtectedRoute` for authenticated routes.
- `BusinessGate` for routes that need a selected business.
- `RegistrationLayout` for login, signup, and business creation.
- `AppLayout` for the authenticated app shell.
- Feature-scoped providers around business screens.
- Feature pages loaded through `router/lazy-pages.tsx` with suspense wrappers.

Navigation paths, tab definitions, and link helpers live in
`layouts/navigation.tsx`; the route tree itself stays in `router/`. The
development-only design-system route is present only in development builds.

### Data and state

- Server state uses TanStack Query. Query keys and mutations are owned by the
  feature that owns the data.
- Cross-feature reference data uses the shared `referenceQueryPolicy`: it is
  cached for the session and refreshed only when an owning mutation invalidates
  it.
- Local UI state uses `useState` or `useReducer`. There is no global store.
- Feature context is for state that must survive navigation within a feature
  area, such as the current sale draft or the selected dashboard period.
- Forms use React Hook Form with schemas and parsers from `@mez/validation`.
- Components do not call `fetch`. They use feature hooks, which call typed
  feature services, which call `lib/apiClient.ts`.

`apiClient` resolves the API base URL, attaches the current Supabase access
token, serializes JSON, and converts the API error envelope into `ApiError`.

## 4. API application

### Directory model

```text
apps/api/
  generated/prisma/           Generated Prisma Client
  prisma/
    migrations/               Database migrations
    schema.prisma             Prisma schema
    seed.ts                   Platform unit seed data
  src/
    __tests__/                Cross-module HTTP integration tests
    config/env.ts             Production environment validation
    lib/
      db/prisma.client.ts     Prisma Client singleton
      jwt.ts                  Supabase JWT verification
      storage/                Supabase Storage adapter and keys
    modules/                  Domain modules
    shared/
      errors/                 AppError, error codes, error handler
      types/                  Cross-module API types
      utils/                  Cross-module utilities
    app.ts                    Middleware and router mounting
    composition.ts            Concrete dependency wiring
    server.ts                 HTTP listener
```

### Modules

| Module      | Responsibility                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `auth`      | Verifies bearer tokens and resolves the Supabase identity to an owner. Provides middleware, not routes. |
| `business`  | Business list, create, read, and update; resolves the request's business scope and role.                |
| `owner`     | Owner profile read and update.                                                                          |
| `products`  | Product and product-unit reads and writes; mounts the upload subrouter.                                 |
| `units`     | Platform dimensions and standard units. Its route is public and mounted before auth.                    |
| `batches`   | Batch creation, batch history/detail, and inventory product reads.                                      |
| `sales`     | Sale creation, sale list/detail, and payment recording against a sale.                                  |
| `payments`  | Payment summary reporting.                                                                              |
| `customers` | Customer list and create.                                                                               |
| `members`   | Member list and member performance reads.                                                               |
| `dashboard` | Attention, summary, trend, and member performance reporting.                                            |
| `uploads`   | Upload lifecycle and signed upload/download URLs.                                                       |

### Module anatomy

Most modules use the same file suffixes:

| File                     | Responsibility                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `<module>.routes.ts`     | Express paths and middleware order. No business logic.                                                   |
| `<module>.middleware.ts` | Request validation, business authorization, and role gates.                                              |
| `<module>.controller.ts` | Reads the resolved request scope and validated input, calls the service, and writes the HTTP response.   |
| `<module>.service.ts`    | Business rules and orchestration. Accepts `Actor`/`Scope` and typed inputs, not Express request objects. |
| `<module>.repository.ts` | Prisma queries, selects, and transactions. The only layer that knows Prisma record shapes.               |
| `<module>.types.ts`      | Module contracts: service interface, repository interface, records, and mapping types.                   |
| `utils/`                 | Optional pure helpers used only by that module. Present in `batches`, `dashboard`, and `sales`.          |
| `__tests__/`             | Colocated unit and integration tests.                                                                    |

Modules include only the files they need. `auth` has no routes, and `units` has
no middleware. A module is not required to create an empty file for every suffix.

### Request lifecycle

```text
app.ts
  CORS + JSON + /health
  /api/units                 public platform data
  /api/* auth middleware     verify JWT and resolve owner
  module router
    authorizeBusiness        resolve businessId, branchId, memberId, role
    requireBusinessRole      optional role gate
    validation middleware    validate body/query/params
    controller               read req.auth, req.validBody, req.validQuery
    service                  apply business rules
    repository               query or transact through Prisma
  shared error handler       return the JSON error envelope
```

Not every route uses every step. Owner routes require authentication but not a
business scope. Units are public. Business-scoped routes always resolve their
scope from the authenticated owner and the `businessId` path parameter before
the controller runs.

### Composition

`composition.ts` is the API composition root. It builds:

- The storage client.
- Repositories from the Prisma client.
- Services from repositories and external adapters.
- Controllers from services.
- Routers from controllers and middleware.

Cross-module dependencies are wired here rather than imported directly. For
example, the upload resolver is built from the products service and passed into
the uploads router; the business service is passed into authorization middleware
shared by several modules.

`app.ts` only mounts global middleware and routers. `server.ts` only starts the
listener. Neither file contains business logic.

Modules create their implementations through factories such as
`createBatchRepository(prisma)` and `createBatchService(repository)`. Tests can
replace a repository or service without starting a database.

## 5. Shared packages

### `@mez/types`

- Contains TypeScript types and DTOs used by both applications.
- Has no runtime dependencies.
- Does not contain Prisma models or Zod schemas.
- Is the single source of truth for request, response, and domain shapes that
  cross the API boundary.

### `@mez/validation`

- Depends on `@mez/types` and Zod.
- Builds schemas against the shared types and exposes validators such as
  `validateCreateBatch` and `validateSaleListFilters`.
- Returns the shared `ValidationResult` shape with field-keyed errors.
- Is used by API middleware and web forms, so validation behaviour stays
  aligned across both sides.

Changing a contract means changing the shared package first, then updating the
API and web consumers. Do not create a local duplicate of a shared request or
response type.

## 6. Data and persistence

- Prisma schema, migrations, and seed data live in `apps/api/prisma`.
- Prisma Client is generated into `apps/api/generated/prisma` and is never
  edited by hand.
- Prisma queries and transactions stay in repositories. Module types and pure
  mapping helpers may reference generated record or enum types where they
  describe storage shapes, but they do not query the database.
- Services work with module types and DTOs. Mapping from stored decimals and
  Prisma records to API responses happens at the module or shared utility
  boundary.
- Multi-write operations that must stay consistent, such as creating a batch
  and adjusting stock, run inside a repository transaction.
- Business-scoped repository methods receive the resolved `businessId` and,
  where relevant, `branchId`. Controllers and services do not treat a
  client-supplied business id as authorization.

The Prisma schema also contains models and enums that are ahead of their API
and UI surfaces, such as containers, losses, and audit logs. Those are schema
scaffolding, not current features. See the roadmap in the
[README](../README.md) for their status.

## 7. Authentication and tenancy

- Supabase Auth issues sessions and JWTs. Sign-in is currently owner-only.
- The web app obtains the access token through Supabase and `apiClient` sends
  it as a bearer token.
- The API auth middleware verifies the token against Supabase JWKS and resolves
  the provider user id through `AccountIdentity` to an owner.
- Business routes run `authorizeBusiness`, which validates the requested
  `businessId` against that owner's businesses and resolves the acting
  `BusinessMember`, branch, and role.
- Role gates use the fixed `BusinessMemberRole` values: `OWNER`, `MANAGER`,
  `CASHIER`, and `SERVER`.
- Role-restricted write routes place their gate after scope resolution and
  before validation and controller execution. Read routes are generally open to
  any member of the business.
- The Supabase service-role key is server-only. The browser never receives it;
  the API uses it only for server-side storage operations.

## 8. Cross-cutting concerns

### Errors

API code throws `AppError` with a code, status, message, and optional field
details. The shared error handler returns one JSON envelope:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid request",
    "details": {
      "name": "Business name is required"
    }
  }
}
```

The web `ApiClient` converts that envelope into `ApiError`, preserving the code,
status, and details.

### Environment

- API production variables are checked by `apps/api/src/config/env.ts`.
- Web production variables are checked by `apps/web/src/config/env.ts` and the
  Vercel production build guard in `vite.config.ts`.
- Secrets live in deployment environment variables and `.env.example` files,
  never in source.

### File transfer

Product images use direct-to-storage transfers:

1. The client requests an upload record and signed upload URL from the API.
2. The browser uploads directly to Supabase Storage.
3. The client confirms the upload.
4. Downloads use signed URLs issued by the API.

See [File Transfer Architecture](file-transfer-architecture.md) for the full
lifecycle.

### Queries

- Feature query keys include the business id so cached data cannot leak across
  businesses.
- Mutations invalidate the query keys owned by the same feature.
- Cross-feature reference data is cached once per session and refreshed through
  invalidation, not background refetching.

## 9. Engineering rules

### Boundaries

1. **A feature does not import another feature.** Use a provider port plus a
   global hook when data crosses a feature boundary.
2. **An API module does not import another API module.** Move shared code to
   `shared`, or inject the other module's service in `composition.ts`.
3. **Shared folders are for shared code.** A component, hook, type, or utility
   moves to a global folder only when it is used by more than one owner. If it
   stops being shared, move it back.
4. **The dependency direction is one way.** Web features depend on global
   infrastructure and shared packages. API modules depend on `shared`, `lib`,
   and shared packages. Neither application imports the other.
5. **No empty architecture.** Create folders and layers when the first real file
   needs them, not in advance.

### Where code belongs

| Need                                               | Location                                                 |
| -------------------------------------------------- | -------------------------------------------------------- |
| Generic button, input, dialog, or layout primitive | `apps/web/src/components`                                |
| App shell, route guard, navigation                 | `apps/web/src/layouts`                                   |
| Screen owned by one domain                         | `features/<feature>/pages`                               |
| UI used by one domain                              | `features/<feature>/components`                          |
| Server state owned by one domain                   | `features/<feature>/hooks` plus `features/<feature>/api` |
| Data needed by multiple features                   | A provider port plus a hook in `apps/web/src/hooks`      |
| App-wide state or cross-feature service wiring     | `apps/web/src/providers`                                 |
| Pure helper used by one feature                    | `features/<feature>/lib`                                 |
| Infrastructure or helper used across features      | `apps/web/src/lib`                                       |
| Request or response contract                       | `packages/types`                                         |
| Form or request validation                         | `packages/validation`                                    |
| Route definitions                                  | Module `.routes.ts` file                                 |
| Validation, authorization, role gate               | Module `.middleware.ts` file                             |
| HTTP translation                                   | Module `.controller.ts` file                             |
| Business rule                                      | Module `.service.ts` file                                |
| Prisma query or transaction                        | Module `.repository.ts` file                             |
| Helper used by multiple API modules                | `apps/api/src/shared`                                    |

### API rules

- Keep routes thin. Route files declare paths and middleware order only.
- Validate at the HTTP boundary with `@mez/validation`. Controllers receive
  validated values from `req.validBody` and `req.validQuery`.
- Do not put Express request or response types in a service.
- Do not issue Prisma queries outside a repository. Do not import the Prisma
  client into a controller or service; keep generated record shapes in module
  types or mapping helpers.
- Do not put business rules in a repository. A repository may compose a
  transaction and return records, but the decision belongs in the service.
- Throw `AppError` for handled failures. Do not build ad hoc error responses.
- Resolve business scope before using it. Do not trust a business id from a
  body or query string.
- Register new routers and middleware in `composition.ts` and `app.ts` only.
- Use factory functions for repositories, services, controllers, and routers so
  tests can substitute boundaries.
- Use ESM imports with the `.js` extension inside `apps/api`, matching the
  project's NodeNext configuration.

### Web rules

- Do not import across feature folders. Cross-feature reads go through a
  provider port and a global hook.
- Do not call `fetch` outside `lib/apiClient.ts`.
- Put HTTP path construction in the owning feature's `api` service, not in a
  component.
- Keep query keys and invalidation with the hooks that own the data.
- Put form state in a feature hook and validation in `@mez/validation`.
- Keep route registration in `router/`. Feature code may use navigation path
  helpers, but must not define routes.
- Mount feature-only providers in the router shell. Mount app-wide providers in
  `App.tsx`.
- Use the `@/` alias for cross-directory imports and relative imports within a
  feature.
- Name components in PascalCase, hooks with `use`, and service factories as
  `createXService`.

### Contracts

- Shared request, response, and domain types belong in `@mez/types`.
- Shared validation belongs in `@mez/validation`.
- Do not leak Prisma types into `@mez/types` or into web code.
- Update the contract, then both consumers, then tests. A contract is not
  duplicated per application.

## 10. Testing

Tests are colocated with the code they cover, either as
`<name>.test.ts(x)` or inside a nearby `__tests__` folder. Feature-wide fixtures
live in the feature's test folder or fixtures folder.

| Test type                  | Placement and boundary                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| API service unit test      | `modules/<module>/__tests__/<module>.service.test.ts` with a mocked repository                                                      |
| API repository unit test   | `modules/<module>/__tests__/<module>.repository.test.ts` with a mocked Prisma client                                                |
| API HTTP integration test  | `apps/api/src/__tests__` for cross-module flows, or a module's `__tests__` for a focused router; Supertest with mocked repositories |
| Web service unit test      | `features/<feature>/api/__tests__` or an adjacent `.test.ts`, with a mocked `ApiClient`                                             |
| Web hook or component test | Beside the hook or component, with mocked providers and services                                                                    |
| Pure helper test           | Beside the helper, with no mocks unless the helper has a boundary dependency                                                        |

### Message assertions

Tests must not pin message text that the test does not own. Messages are
implementation and product copy, and they change independently of behaviour.

- API failures are asserted by `code`, status, and `message: expect.any(String)`.
  Field errors are asserted by key and presence, not wording.
- Validation copy from `@mez/validation` is asserted by field key, presence, or
  the resulting behaviour. Do not assert the sentence.
- UI copy produced by the application is asserted through roles, labels,
  presence, disabled state, or the absence of an action. Do not assert the
  sentence.
- If a test mocks a dependency to reject with `new Error('network down')`, the
  test may assert `network down` because the test supplied that value.
- Error formatter tests may assert exact text only when the exact text is the
  input supplied by the test.

Prefer assertions that describe capabilities and outcomes:

```ts
expect(service.createBatch).toHaveBeenCalledTimes(1);
expect(error).toEqual(
  expect.objectContaining({ code: 'BAD_REQUEST', statusCode: 400, message: expect.any(String) }),
);
expect(screen.getByRole('alert')).toBeInTheDocument();
```

Avoid assertions that lock copy:

```ts
expect(screen.getByText('Invalid request')).toBeInTheDocument();
expect(error.message).toBe('Validation failed for field name');
```

### Adding a vertical slice

1. Define the request, response, and domain shapes in `@mez/types`.
2. Add or update validation in `@mez/validation`.
3. Add the API module files and tests.
4. Register concrete dependencies in `composition.ts` and mount the router in
   `app.ts`.
5. Add the web feature service and tests.
6. Add feature hooks, components, and pages.
7. Add the lazy route entry in `router/lazy-pages.tsx` and the route in
   `router/index.tsx`.
8. If another feature needs the data, add a provider port and global hook
   instead of importing the owning feature.
9. Run format, lint, typecheck, tests, and build.

## 11. Deployment

The web app deploys to Vercel and the API to Render. Both build from the
repository root so the pnpm workspace and shared packages are available.
PostgreSQL, Auth, and Storage are hosted in Supabase.

CI runs formatting, linting, typechecking, tests, and builds. Changesets drive
versions and tags; tagged releases trigger the deployment workflows. See
[Workflows](workflows.md) and [Deployment](deployment.md) for platform settings
and release steps.

## 12. Related documentation

| Document                                       | Contents                                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [Product requirements](prd.md)                 | Product scope, roles, and rules                                                                |
| [Data schema](schema.md)                       | Tables, relationships, and design notes                                                        |
| [Unit system](unit-system-architecture.md)     | Unit model, conversion, and transaction snapshots                                              |
| [File transfer](file-transfer-architecture.md) | Signed upload and download lifecycle                                                           |
| [Features](features/)                          | Auth, business, products, inventory, sales, customers, members, dashboard, uploads, and errors |
| [Workflows](workflows.md)                      | CI, release, and deployment workflows                                                          |
| [Deployment](deployment.md)                    | Render, Vercel, and database migration setup                                                   |
