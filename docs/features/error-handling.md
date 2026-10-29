# Error Handling

## Purpose

Every handled failure should reach the client as a consistent JSON shape so
the frontend can deal with errors uniformly, regardless of which part of the
system produced them.

## The error class

`shared/errors/app-error.ts` defines a single `AppError` class carrying a
`code`, a `message`, a `statusCode`, and an optional `details` field:

```ts
new AppError(code, message, statusCode, details?)
```

The `ERROR_CODES` constant and `ErrorCode` union expose four codes:

| Code             | HTTP Status | Typical use                                        |
| ---------------- | ----------- | -------------------------------------------------- |
| `UNAUTHORIZED`   | 401         | Missing / invalid token, missing `ownerId`         |
| `BAD_REQUEST`    | 400         | Validation failures (with field-level `details`)   |
| `NOT_FOUND`      | 404         | A requested resource is absent or not the caller's |
| `INTERNAL_ERROR` | 500         | Unexpected failures                                |

An `isAppError(value)` type guard is exported for use in the global handler
and anywhere an unknown error needs narrowing.

## The details field

`details` is an optional `Record<string, string>` that carries per-field error
messages. Path-based keys come from the Zod-based validation layer in
`@mez/validation`; services that inspect list items reuse the same dotted paths
(for example, `lines.0.productId` for sale stock and
`lines.0.productUnitId` for unit sellability), so clients handle every error
with one shape.

1. `validateInput()` calls Zod's `safeParse()` and, on failure, builds a
   record mapping each field path to a human-readable message (e.g.
   `{ name: "Business name is required" }`). Top-level errors use the key
   `_root`.
2. The validation middleware passes this record to `AppError`:
   ```ts
   throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
   ```
3. The global handler conditionally spreads it into the response (see
   below).

Any future endpoint that performs server-side validation can follow the same
pattern.

## Global handler

`shared/errors/error-handler.ts` is registered last in `app.ts`. Because it
has the four-argument Express signature, Express treats it as the error
handler and routes thrown errors to it.

- `AppError` values are answered with the error's `statusCode` and the
  response shape described below.
- Any other error is logged and answered as `500 INTERNAL_ERROR`.

## Response shape

Every handled error responds with:

```
{ error: { code, message } }
```

When a `details` record is present the response includes it:

```
{ error: { code, message, details: { fieldName: "error message", ... } } }
```

The `details` key is omitted entirely when there are no field-level errors;
it is never `null` or `undefined` in the response body.

## Express 5 auto-forwarding

Express 5 automatically forwards rejected promises and thrown errors to the
next error handler, so middleware and route handlers do not need try/catch
blocks — a thrown `AppError` reaches `errorHandler` directly.
