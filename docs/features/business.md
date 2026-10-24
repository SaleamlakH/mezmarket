# Business

## Purpose

Every shop owner needs at least one business before they can do anything in
the app. This feature covers the whole lifecycle of that business: creating
it, listing the businesses an owner owns, and later viewing and updating the
shop's own settings.

These settings are not cosmetic. They are the shop-wide defaults that the
rest of the app reads — a change here changes how every sale, receipt, and
stock warning in the business behaves. That is why they are edited as a group
on one profile rather than scattered across the features that consume them.

On creation the system also auto-creates a default `main` branch and
registers the owner as a member with the `OWNER` role, so a business is
never in a half-built state.

These are shop concerns, not account concerns. The owner's own contact
details are a separate entity, documented in [owner-profile.md](owner-profile.md).

For the identity model and auth flow, see [auth.md](auth.md) and
[schema.md](../schema.md).

## Concept model

- A business always belongs to exactly one owner. The owner is resolved from the authenticated identity on the server and never accepted from the client, so an owner can only ever read or update their own business.

- One owner may own several businesses, so a business is addressed by its own id (`/api/businesses/:businessId`) and never inferred from the identity alone. The owner's businesses are listed oldest first, which is the order they were created in.

- The settings on this profile are the shop's name, its currency, the default tax rate, whether tax is displayed inclusive or exclusive, whether sales may go beyond recorded stock, and the low-stock alert threshold. Whether sales may go beyond stock is a stored default that can only be changed here, never chosen at creation. The low-stock threshold is also stored but is not currently applied as a fallback: inventory and dashboard status use each product's own `lowStockThreshold`.

- An update restates the profile rather than patching it: the name and the currency are part of every save, because the form always submits the whole profile it was opened with. The remaining settings may be left out, and a field left out keeps whatever was already stored.

- Ownership and identity are fixed. The shape of an update request is derived from the settings that are editable, so a client cannot reassign a business to a different owner or rewrite its history even by constructing the request by hand.

## Frontend UI flow

The Business profile page is a sub-page under Settings, reached from **Settings → Business profile**. It opens read-only, showing the business name and its settings. Clicking Edit swaps the read-only view for a form pre-filled with the current values, along with Save and Cancel actions.

Save stays disabled until something actually changes, so an untouched form cannot be re-submitted. A successful save returns to the read-only view showing what the server stored; a failure stays in edit mode with the error surfaced and the changes kept, so they can be corrected and retried. Cancel discards the changes and returns without writing anything.

An owner with no business selected sees an empty state instead of the page.

```
Settings ─▶ Business profile entry
                │
                ▼
          ┌─────────────┐
          │   Loading   │
          └─────────────┘
                │
          ┌─────┴───────┐
          ▼             ▼
   No business      View
   selected         │  ▲
   (empty state)    ▼  │
          ▲        Edit ─┘
          │          │
       Cancel     Save ─▶ View (reflects saved values + success notice)
          │          │
          └──────────┘ (failure ─▶ stays on Edit with the error surfaced)
```

## Request flow

### POST /api/businesses

```
Client -> Authorization: Bearer <jwt> + JSON body
   -> auth middleware resolves the owner id from the session
   -> validation middleware validates the body against the shared rules
   -> service verifies the owner id is present
   -> repository creates the business, its "main" branch, and its owner
      membership (name "me", role OWNER) in a single transaction
   -> 201 { business, branch, member }
```

### GET /api/businesses

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner id from the session
   -> service verifies the owner id is present
   -> repository returns the owner's businesses, oldest first
   -> 200 { businesses: [...] }
```

### GET /api/businesses/:businessId

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner id from the session
   -> controller reads the business id from the route
   -> service verifies the owner id is present
   -> repository looks up the business scoped to that owner
   -> service reports the business as missing when the scoped lookup
      matched nothing
   -> 200 { business }
```

### PUT /api/businesses/:businessId

```
Client -> Authorization: Bearer <jwt> + JSON body (the settings being saved)
   -> auth middleware resolves the owner id from the session
   -> controller reads the business id from the route
   -> validation middleware validates the body against the shared rules
   -> service verifies the owner id is present
   -> service confirms the business is the caller's before writing
   -> repository writes the submitted settings
   -> 200 { business }
```

The two single-business endpoints differ only in whether they mutate: both
take the business id from the route and the owner from the session, both
return the same shape, and both convert the stored decimals to plain numbers
on the way out, so a business is represented identically whether it came from
a list, a create, a read, or an update. The update answers only after the
ownership check, and answers it before writing anything.

## Shared contract

The business shape and its update request are defined once in a shared
contract that both the API and the client import, so the two cannot disagree
about what a business is or what may be sent about one. The same rules run
over the form on the client and the payload on the server, so a value the UI
accepts is never rejected on save.

Validation failures are reported with per-field detail as described in
[error-handling.md](error-handling.md).

## Error concepts

- Unauthenticated request: the identity cannot be established, or the owner a business belongs to cannot be resolved from it.
- Invalid payload: fails the shared validation rules, returned with per-field detail so the form can show the message against the offending field.
- Not found: the business does not exist, or is not the caller's. The two cases answer identically and on purpose, so that business ids cannot be probed through the API.
- Unexpected failure: any other error, reported as an internal error.

Every failure is delivered as a structured error envelope rendered by the
global error handler; see [error-handling.md](error-handling.md).

## Design rationale / invariants

Ownership is derived, never trusted. Because the owner id comes from the
authenticated identity rather than the request body, a caller has no way to
read or edit a business they do not own. The client is never asked to supply
or confirm who the owner is, so there is no value in the request for it to
tamper with.

Tenant scoping is centralised rather than repeated per query. Every read of a
single business goes through one scoped lookup, and the update path is forced
to pass through it before writing. That ordering is load-bearing: a plain
update by id is not tenant-scoped, so without the confirmation step first,
any owner could overwrite any business in the system by guessing its id. The
scoped read is the authorization step; the write that follows is safe only
because it is gated by it.

Not found and not yours are the same answer. Collapsing the forbidden case
into the missing case means the client has one failure to handle instead of
two, and it means the API never confirms that an id exists for somebody else.
The cost is that a genuine typo and a genuine permission failure look the
same, which is the right trade for an API reachable by anyone signed up.

Creation is atomic. The business, its default branch, and its owner
membership are inserted in a single transaction, so if any of the three fails
the whole thing rolls back and the owner never ends up with a business that
has no branch or no membership. Creating a business is the one moment where a
half-built record would be most damaging, because everything else in the app
resolves through those rows.

An update restates the profile rather than patching it: the name and the
currency travel with every save because the form submits the whole profile it
was opened with, and a setting left out keeps its stored value. What the owner
gets back is the server's own persist result rather than the submitted payload
echoed back, and the UI reflects exactly that — keeping what is shown, what
was just saved, and what is stored in agreement. The form compares against
the last saved values rather than the values it was opened with, so leaving
edit mode and coming back never presents a stale baseline or reports an
unchanged form as edited.

## Cross-references

- [auth.md](auth.md) — how the owner identity is resolved.
- [error-handling.md](error-handling.md) — the structured error envelope.
- [owner-profile.md](owner-profile.md) — the owner's own account details, as
  distinct from the shop settings documented here.
- [../prd.md](../prd.md) — where tax display, the negative-stock policy, and
  the single-currency-per-business rule come from.
- [../architecture.md](../architecture.md) — overall system design.
- [../schema.md](../schema.md) — the `Business` entity.
