# Owner Profile

## Purpose

An owner manages their own account contact details: their display name,
contact email, and contact phone number. These are business-contact fields
only — they are not and can never become the login credential. See the
identity model in [auth.md](auth.md) and the `Owner` entity in
[../schema.md](../schema.md).

## Concept model

- A profile always belongs to exactly one owner. The owner is resolved from the authenticated identity on the server and never accepted from the client, so an owner can only ever read or update their own profile.

- The profile is a small set of fields: name, contact email, and contact phone, which the owner may change.

- Updates are partial: only the fields actually provided are changed, and an update must include at least one field.

## Frontend UI flow

The Profile page is a sub-page under Settings, accessed by clicking Profile under the Account section. It displays name, contact email, and phone number (read-only view). Clicking Edit switches to edit mode, where the user can update these fields. Clicking Cancel discards any changes and returns to view mode. The submit button is disabled until there is a change.

```
Settings ─▶ Profile entry
              │
              ▼
        ┌─────────────┐
        │  Loading    │
        └─────────────┘
              │
        ┌─────┴──────┐
        ▼            ▼
  Unavailable    View
  (retry)        │  ▲
        ▲        ▼  │
        └───  Edit ─┘
                │
            Save ─▶ View (reflects saved values + success notice)
                │
             (failure ─▶ stays on Edit with the error surfaced)
```

## Request flow

### GET /api/owner

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner id from the session
   -> service verifies the owner profile exists
   -> repository looks up the owner profile
   -> 200 { owner profile }
```

### PUT /api/owner

```
Client -> Authorization: Bearer <jwt> + JSON body (partial profile)
   -> auth middleware resolves the owner id from the session
   -> validation middleware validates the body against the shared rules
   -> service verifies the owner profile exists
   -> repository updates the provided fields
   -> 200 { owner profile }
```

Both endpoints are owner-scoped: the owner id comes from the resolved
session, never from the body, so an owner can only read or update their own
profile. They differ only in whether they mutate. Failure responses
(`401` unauthenticated, `400` invalid body with per-field detail, `404`
owner not found) follow the shared error envelope described in
[error-handling.md](error-handling.md), alongside the "Error concepts"
section below.

## Shared contract

The profile shape and its update request are defined once in a shared
contract package so the API and the client agree without drift. The
validation rules are equally shared: the same rules validate the form on
the client and the payload on the server, guaranteeing identical behavior
on both ends.

Validation failures are reported with per-field detail as described in
[error-handling.md](error-handling.md).

## Error concepts

- Unauthenticated request: the identity cannot be established.
- Invalid payload: fails the shared validation rules (per-field detail is
  returned).
- Not found: the owner profile does not exist.
- Unexpected failure: any other error, reported as an internal error.

Every failure is delivered as a structured error envelope rendered by the
global error handler; see [error-handling.md](error-handling.md).

## Design rationale / invariants

Ownership is derived, never trusted. Because the owner id comes from the authenticated identity rather than the request body, a caller has no way to read or edit another owner's profile.

Validation rules live in a single shared place and are reused by both the form and the server, so the client and server can never drift apart about what counts as a valid profile update.

Updates stay partial: only the provided fields are persisted and unchanged fields are never sent. The response returned to the owner is the server's own persist result, and the UI reflects exactly that — keeping what is shown, what was just saved, and what is stored in agreement.

## Cross-references

- [auth.md](auth.md) — how the acting owner is resolved.
- [error-handling.md](error-handling.md) — the structured error envelope.
- [business.md](business.md) — the shop's own settings, including the
  business creation that on-boards an owner.
- [../architecture.md](../architecture.md) — overall system design.
- [../schema.md](../schema.md) — the `Owner` entity.
