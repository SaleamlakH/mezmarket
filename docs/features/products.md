# Products

## Purpose

The catalog. A product is the thing a business buys, stocks and sells; this
feature creates one, lists a business' products, and reads a single product
back. Every product is permanently attached to the units it is traded in — the
standard ones it is measured in, and any number of the owner's own, such as a
`shot` or a `slice` — and can carry a single photo.

A product's photo is not stored on the product itself — the transfer
architecture behind it is described in
[../file-transfer-architecture.md](../file-transfer-architecture.md), and the
data model in [../schema.md](../schema.md). This document covers only what the
product feature itself does with an image, and the limits that come with it.

## Concept model

- A product always belongs to exactly one business and one branch. Both are
  derived server-side from the resolved session and are never accepted from
  the client, so a caller can only ever see or create products inside a
  business they actually own.

- A product carries its units as separate rows, so the base unit, the content
  unit and the owner's own are the same kind of thing: exactly one required
  base unit, at most one content unit, and any number of the owner's own. The
  content unit is optional and records how much content one base unit contains
  (one piece being 350 ml); when both exist they must differ _and_ belong to
  different dimensions, since two units from the same dimension cannot express
  a conversion.

- On top of those two, a product can carry any number of units of the owner's
  own — the portions and friendly labels the PRD defines (§3.2, §5). Each is a
  bespoke row with no standard unit behind it, measured against exactly one
  basis: the base or content unit, never another custom unit. Its rate reads the
  opposite way round from the content unit's — how much of its basis one such
  unit is worth (`slice` = `0.125`, `box` = `12`) — and the basis always lands on
  a standard unit in one step, since the base and content rows carry the
  standard units they resolved to.

- Names are unique per product (compared case-insensitively), and each unit says
  what it may be used for — bought, sold, or both — while one that can be sold
  without a price, or one usable for neither, is refused. They are created in
  the same request as the product — a unit based on the content unit needs that
  unit to exist — cannot be changed or removed afterwards, and never get to
  choose their own role.

- Stock is not entered at creation: it is a cached, derived value that starts
  at zero and is recomputed from receipts, sales and losses. A product is
  created active, only active products are listed, and there is no way to
  change or remove a product yet.

## Frontend UI flow

The Products page shows the catalog as a grid of cards, newest first, each card
carrying the name, sellable units, price and current stock. Creating a product
is a two-step dialog in one form: the product first (photo, name, brand, base
unit and its price, optional content unit, low stock threshold, track-as-partial),
then the owner's own units, where the create button lives. Next validates only
the first step, Create sends everything, and an empty second step creates the
product exactly as before. Each unit is a card, one open at a time, with its
basis offered by symbol. A chosen photo previews immediately but never blocks
submitting — if its request fails, the product is still created without the
image. Creating the product closes the dialog and puts it at the top of the grid.

## Request flow

### GET /api/units

The platform's standard units, grouped into their dimensions. This is the only
endpoint that does not require authentication — the units are reference data
shared by every business, not tenant data. The client holds the result for the
life of the page, since standard units effectively never change.

A product's own units are not in it, and cannot be: they are per-product and
mean nothing anywhere else.

```
Client -> GET /api/units
   -> every dimension with its standard units, ordered
   -> 200 { dimensions: [ { id, name, units: [...] } ] }
```

### GET /api/businesses/:businessId/products

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware checks the owner owns :businessId
      and resolves the business' default branch
   -> repository returns the active products for that scope,
      newest first, each with its units
   -> service converts decimals to plain numbers and attaches the
      image id taken from each product's live image claim
   -> 200 [ { product, units, uploadId }, ... ]
```

An empty catalog is a `200` with an empty list, not a `404`. The grid lists the
names of every unit a product can be sold in, custom ones included.

### POST /api/businesses/:businessId/products

```
Client -> Authorization: Bearer <jwt> + JSON body
   -> auth middleware resolves the owner
   -> business middleware resolves the business and default branch
   -> validation middleware applies the shared create rules
   -> service requires the resolved scope
   -> repository runs one transaction:
        1. insert the product
        2. look up the chosen base standard unit
        3. look up the content standard unit, when one was given
        4. reject an unknown unit, or a content unit that shares
           the base unit's dimension
        5. insert the base unit row, always
        6. insert the content unit row, when one was given
        7. reject a custom unit whose name is already taken on this
           product — by the base or content unit's symbol, or by
           another custom unit — the whole set being checked before
           any of it is written
        8. insert one row per custom unit, always as a unit with
           no standard unit behind it, named as the owner gave it,
           and carrying a price only when it can be sold
        9. insert the image claim, when an image was requested
   -> 201 { product, units, uploadId }
```

The whole thing is one transaction: a product never exists without its units,
and an unknown or conflicting unit rejects the entire creation rather than
leaving a partial product behind. A name clash only the database can see — two
requests racing, or a row added between the read and the write — is reported as
the same failure with no field attached, because the repository cannot say
which unit it was.

### GET /api/businesses/:businessId/products/:productId

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> repository loads the product by id, scoped to the business
   -> service attaches the units and the live image claim
   -> 200 { product, units, uploadId }
```

## How a product's image is attached

The transfer itself — presigned links, upload state, moving bytes between the
browser and storage — is covered in
[../file-transfer-architecture.md](../file-transfer-architecture.md). What the
product feature adds: choosing validates the photo (image formats, ≤ 10 MB),
previews it and authorizes the upload immediately; submitting waits for that
authorization if still in flight, then sends the bytes and creates the product
with the resulting image id in the same transaction; reading signs download
links for a business's images and each card fetches its own. A replaced or
cleared selection abandons its authorization, a failed one shows why, and the
product is still created without the image. The architecture's reconciliation
pass is not implemented — see below.

## Limitations — image handling

- **Claims are never verified.** The browser-reported type and size are recorded
  as given and never checked against the stored bytes, so a stray client can
  store a non-image or an oversized file under an image name.
- **A failed transfer is invisible.** The authorization failure is reported, but
  the transfer itself is deliberately not awaited, so one that fails leaves a
  product whose image can never load and tells the user nothing.
- **Nothing reclaims unclaimed uploads.** The expected "changed my mind" case
  leaves a record every time, and the periodic reconciliation the architecture
  assigns to it is not implemented. Write links are spent long after they are
  issued and can expire while a dialog stays open.
- **No processing and no soft delete.** Bytes go straight to storage, so images
  are stored and served exactly as uploaded, always full-size. Removed-image
  claims are modeled as soft deletes that every read ignores, but nothing ever
  writes that marker.
- **Reads scale with the catalog.** The grid signs a link for every image in
  one unbounded request, and the browser keeps every image it has shown for the
  life of the page, with no eviction.

## Limitations — custom units

- **A unit cannot be changed or removed.** They exist only inside the request
  that creates the product: no renaming, no retyping a rate, no deletion. The
  PRD treats units as mutable configuration, so this is a gap rather than a
  decision.

- **Names are per product.** The same word on two products is two unrelated
  units, and there is no template library yet (PRD Phase 3) — a business sets up
  `box = 12 pc` once per product. Names are matched case-insensitively by the
  application, while the database's own index is case-sensitive.

- **Nothing consumes these units yet.** Sales, inventory and the dashboard are
  placeholders, so a rate is validated, stored, and never applied; the only
  reader is the catalog card listing a product's sellable units. Nothing resolves
  a rate to a standard quantity either.

- **`track-as-partial` is a switch with nothing behind it.** The PRD conditions
  it on having a content unit and a sell-capable unit smaller than one base unit;
  nothing checks that, and a custom unit is exactly what would qualify one.

- **Unit order is not stable.** Creation answers in submission order, reads sort
  by role then by creation — harmless only as long as nothing depends on it.

## Error concepts

- Unauthenticated request: the identity cannot be established.
- Not your business: the business is not one the owner owns, or it has no
  branch to scope to.
- Invalid payload: fails the shared validation rules, reported with per-field
  detail.
- Unusable unit: the base or content unit does not exist, or a content unit
  was given in the base unit's dimension.
- Unit name taken: a unit of the owner's own shares a name, ignoring case, with
  another unit on the same product or with the base or content unit's symbol.
  Field-level where the clash can be attributed to one unit, fieldless when only
  the database's index caught it.
- Unit with no use: neither bought nor sold, or sellable with no price.
- Not found: the product does not exist within the resolved scope.
- No image: a specific image was asked for and the product has no live claim
  for it, or its claimed image turned out not to exist.
- Storage unavailable: storage is not configured in the deployment, or a link
  could not be signed.

Every failure is delivered as a structured error envelope by the global error
handler; see [error-handling.md](error-handling.md).

## Design rationale / invariants

- **Scope is derived, never trusted.** Business, branch and the acting owner
  come from the resolved session, and possession of an image id is the
  capability, which is why ids are generated rather than chosen.
- **A product and its units are one unit of work.** The product, its base,
  optional content and owner's own units, and its image claim are written in a
  single transaction, so a product can never exist half-created.
- **Every decision about a unit is single-sourced.** The role is the server's
  to assign, a unit is based on the base or content unit only — no chains whose
  rates could contradict each other — price and sellability are one decision
  written through one flag, and validation rules live in one place shared by
  form and server. The whole unit-name set is checked before any of it is
  written, with the unique index as the backstop for a race.
- **The photo never blocks the product.** It is authorized early but applied
  at most once, and if it cannot be prepared the image is dropped, the reason
  shown, and the product is still created — a smaller failure than refusing
  it. Images are fetched per card so a slow one neither blocks nor fails its
  neighbours, and a repeat visit re-downloads nothing.

## Cross-references

- [auth.md](auth.md) — how the acting owner is resolved.
- [business.md](business.md) — where the business and its default branch come
  from.
- [error-handling.md](error-handling.md) — the structured error envelope.
- [../architecture.md](../architecture.md) — overall system design.
- [../prd.md](../prd.md) — what a unit of the owner's own is for, and the unit
  system's rules (§3.2, §5).
- [../schema.md](../schema.md) — the `Product`, `ProductUnit`, `Upload` and
  `Attachment` entities.
- [../file-transfer-architecture.md](../file-transfer-architecture.md) — how
  files are uploaded, downloaded and tracked.
