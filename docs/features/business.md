# Business Creation

## Purpose

Every shop owner needs at least one business before they can do anything in
the app. This feature handles creating that first business (and optionally
listing all of an owner's businesses). On creation the system also
auto-creates a default "main" branch and registers the owner as a member
with the `OWNER` role.

For the identity model and auth flow, see [auth.md](auth.md) and
[schema.md](../schema.md).

## Request flow

### POST /api/businesses

```
Client -> Authorization: Bearer <jwt> + JSON body
   -> auth middleware sets req.auth.ownerId
   -> business middleware validates body via @mez/validation
   -> controller extracts ownerId + validated input
   -> service checks ownerId is present
   -> repository runs Prisma transaction:
        1. create Business row
        2. create Branch row (name="main")
        3. create BusinessMember row (name="me", role=OWNER)
   -> 201 { business, branch, member }
```

### GET /api/businesses

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware sets req.auth.ownerId
   -> controller passes ownerId to service
   -> service calls repository.listForOwner
   -> repository returns businesses ordered by createdAt asc
   -> 200 { businesses: [...] }
```

## Module layout

- `packages/types/src/business/business.types.ts` — shared domain types
  and DTOs (`Business`, `Branch`, `BusinessMember`, request/response types).
- `packages/validation/src/schema/business.schema.ts` — Zod schema for the
  create-business request body.
- `apps/api/src/modules/business/business.types.ts` — internal module
  interfaces (`BusinessRepository`, `BusinessService`).
- `apps/api/src/modules/business/business.repository.ts` — Prisma data
  access.
- `apps/api/src/modules/business/business.service.ts` — business logic.
- `apps/api/src/modules/business/business.controller.ts` — HTTP request
  handling.
- `apps/api/src/modules/business/business.routes.ts` — Express router
  setup.
- `apps/api/src/modules/business/business.middleware.ts` — validation
  middleware that calls the Zod schema.

## Components

### Validation schema

The create-business schema enforces:

| Field                      | Type   | Rules                                                    |
| -------------------------- | ------ | -------------------------------------------------------- |
| `name`                     | string | required, trimmed, 1–20 characters                       |
| `currencyCode`             | string | required, trimmed, uppercased, must match `/^[A-Z]{3}$/` |
| `defaultTaxRate`           | number | optional, 0–100                                          |
| `taxDisplayMode`           | enum   | optional, `EXCLUSIVE` or `INCLUSIVE`                     |
| `lowStockDefaultThreshold` | number | optional, ≥ 0                                            |

Validation errors are returned as `400 BAD_REQUEST` with field-level
details; see [error-handling.md](error-handling.md).

### Repository

- `create(ownerId, input)` — runs a single Prisma `$transaction` that
  inserts the `Business`, `Branch`, and `BusinessMember` rows atomically.
  Decimal fields are converted to plain JS numbers before returning.
- `listForOwner(ownerId)` — queries `prisma.business.findMany` filtered
  by `ownerId`, ordered by `createdAt asc`.

### Service

- `createBusiness(ownerId, input)` — validates that `ownerId` is present
  (throws `UNAUTHORIZED` otherwise) and delegates to the repository.
- `getBusinesses(ownerId)` — passes through to
  `repository.listForOwner`.

### Controller

Extracts `req.auth.ownerId` and `res.locals.validated`, calls the
appropriate service method, and sends the JSON response. Returns `201` on
creation and `200` on listing.

### Routes

Mounts two endpoints on `/api`:

- `GET  /api/businesses` — list owner's businesses
- `POST /api/businesses` — create a new business

Both are protected by the auth middleware; validation is applied only on the
POST route.

## Design rationale

Every layer is a factory that accepts its dependency explicitly
(`createBusinessRepository(prisma)`, `createBusinessService(repo)`, etc.),
making each layer independently testable.

The create operation is atomic: if any of the three inserts fails the
entire transaction rolls back, so the owner never ends up with a business
without a branch or member record.

The validation schema lives in the shared `@mez/validation` package so the
same rules can be reused on the frontend without duplication.

## Business errors

- Missing or non-Bearer `Authorization` header: `401 UNAUTHORIZED`
  ("Missing token"). See [auth.md](auth.md).
- Invalid `name` or `currencyCode` (or other fields): `400 BAD_REQUEST`
  with per-field error details.
- Missing `ownerId` after auth resolution: `401 UNAUTHORIZED`.
- Unexpected failure during creation or listing: `500 INTERNAL_ERROR`.

All errors are thrown as `AppError` and rendered by the global error
handler; see [error-handling.md](error-handling.md).

## Environment

- `DATABASE_URL` — the Prisma connection string (PostgreSQL).
- `SUPABASE_JWKS_URL` — required by auth; see [auth.md](auth.md).

`.env.example` lists all required variables and is the source of truth.

## Cross-references

- [auth.md](auth.md) — how the owner identity is resolved.
- [error-handling.md](error-handling.md) — `AppError` and the global
  error handler.
- [../architecture.md](../architecture.md) — overall system design.
- [../schema.md](../schema.md) — full data schema.
