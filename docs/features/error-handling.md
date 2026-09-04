# Error Handling

## Purpose

Every handled failure should reach the client as a consistent JSON shape so
the frontend can deal with errors uniformly, regardless of which part of the
system produced them.

## The error class

`shared/errors/app-error.ts` defines a single `AppError` class carrying a
`code`, a `message`, and a `statusCode`, plus the `ERROR_CODES` constant and
`ErrorCode` union:

- `UNAUTHORIZED`
- `NOT_FOUND`
- `BAD_REQUEST`
- `INTERNAL_ERROR`

Services and middleware throw `AppError` when they hit a condition they can
report to the client.

## Global handler

`shared/errors/error-handler.ts` is registered last in `app.ts`. Because it
has the four-argument Express signature, Express treats it as the error
handler and routes thrown errors to it.

- `AppError` values are answered with the error's `statusCode` and the shape
  `{ error: { code, message } }`.
- Any other error is logged and answered as `500 INTERNAL_ERROR`.

## Response shape

Every handled error responds with:

```
{ error: { code, message } }
```

## Express 5 auto-forwarding
