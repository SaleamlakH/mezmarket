# Auth

## Purpose

The API needs to know which owner is acting for a given request. It trusts JWTs issued by Supabase Auth, so the server never re-authenticates users and never stores credentials itself.

For the deeper design context, see [architecture.md](../architecture.md) and the identity model in [schema.md](../schema.md).

## Request flow

```
Client -> Authorization: Bearer <supabase jwt> -> /api/*
   -> auth middleware extracts token through remote JWKs
   -> verifyJwt returns payload { sub, email, name }
   -> authService.resolve(sub, email, name) returns an existing identity or creates one on first login.
   -> req.auth = { ownerId }
   -> onward; errors handled by the global error handler
```

## Module layout

- `lib/jwt.ts` — verifies a Supabase JWT against the remote JWKS.
- `modules/auth/auth.types.ts` — shared contracts: `AuthIdentity`,
  `AuthRepository`, `AuthService`.
- `modules/auth/auth.repository.ts` — database access for identities.
- `modules/auth/auth.service.ts` — find-or-create identity logic.
- `modules/auth/auth.middleware.ts` — Express middleware for the request.

The shared error class and global handler live under `shared/errors/`; see
[error-handling.md](error-handling.md).

## Components

- `verifyJwt` verifies the token with `jose` against the Supabase JWKS URL,
  extracts the `sub` and `email` claims plus the signup name from
  `user_metadata.full_name`, and throws `AppError(UNAUTHORIZED)` on any failure or
  when `sub` is missing.
- `auth.repository` provides `findIdentity`, which queries by `providerUserId`,
  and `createIdentity`, which runs a transaction that creates a new owner using
  the verified JWT name (falling back to `New User`) and the linked account
  identity, returning the identity.
- `auth.service` exposes `resolve`, which returns an existing identity or
  creates one on first login.
- `auth.middleware` reads the Bearer header, verifies the token, resolves the
  identity, and sets `req.auth = { ownerId }`. It has no try/catch; thrown
  errors are auto-forwarded to the global error handler.

## Design rationale

Every layer is a factory that accepts its dependency explicitly
(`createAuthRepository(prisma)`, `createAuthService(repo)`,
`createAuthMiddleware(verifyJwt, service)`). This keeps the layers
testable: tests inject a fake client or repository and exercise the
interface contract instead of touching Prisma or the network.

Identity is decoupled from the auth provider through `AccountIdentity`.
The provider's user id is stored in exactly one place, so the provider can
change without rippling through business-logic tables.

## Auth errors

- Missing or non-Bearer `Authorization` header: `401 UNAUTHORIZED`
  ("Missing token").
- Invalid or unverifiable token, or a missing `sub` claim: `401 UNAUTHORIZED`
  ("Invalid token").
- Unexpected failure during identity resolution: `500 INTERNAL_ERROR`.

All errors are thrown as `AppError` and rendered by the global error handler;
see [error-handling.md](error-handling.md).

## Environment

- `SUPABASE_JWKS_URL` — required, the Supabase JWKS endpoint.
- `CORS_ORIGINS` — allowed client origins.
- `DATABASE_URL` — the Prisma connection string.

`.env.example` lists the required variables and is the source of truth.
