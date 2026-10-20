# Products

## Purpose

The catalog. A product is the thing a business buys, stocks and sells; this
feature creates one, lists a business' products, reads a single product back,
edits it, and activates or deactivates it. Every product is permanently
attached to the units it is traded in — the standard ones it is measured in,
and any number of the owner's own, such as a `shot` or a `slice` — and can
carry a single photo.

A product's photo is not stored on the product itself — the transfer
architecture behind it is described in
[../file-transfer-architecture.md](../file-transfer-architecture.md), and the
data model in [../schema.md](../schema.md). This document covers what the
product feature itself does with an image; the reusable module behind the
endpoints, and the limits that come with it, are in [uploads.md](uploads.md).

## Concept model

- A product belongs to exactly one business and branch, both derived server-side
  from the resolved session and never accepted from the client.

- A product carries its units as separate rows: exactly one required base unit,
  at most one content unit, and any number of the owner's own. The content unit
  is optional and records how much content one base unit holds; when both exist
  they must differ and belong to different dimensions, since two units of the
  same dimension cannot express a conversion.

- Each of the owner's own units is measured against exactly one basis — the base
  or content unit, never another custom unit — and its rate reads how much of
  that basis one such unit is worth (`slice` = `0.125`, `box` = `12`), the
  opposite of how the content unit's rate reads.

- Names are unique per product, compared case-insensitively. Each unit declares
  whether it may be bought, sold, or both; one that can be sold without a price,
  or used for neither, is refused. Units are created with the product — a unit
  based on the content unit travels with it, and the content unit can also be
  added later on its own — and their role and conversion facts are fixed at
  creation. A unit cannot be removed, though its display name, selling price and
  capabilities can change.

- Stock is not entered at creation: it is a cached, derived value that starts at
  zero and is recomputed from receipts, sales and losses. A product is created
  active, can be edited — its own details, the selling price of every unit (the
  base and content units included), and new units added — and deactivated. The
  base and content units keep the names, bases and rates the platform gave them,
  only their selling price moves. A product is never deleted. The catalog lists
  every product, inactive ones marked as such, while the surfaces that pick
  products to transact leave the inactive out.

## Frontend UI flow

### Products page

- Shows the catalog as a grid.
- Each card shows the product's photo, name, brand and current stock, and flags
  low stock.
- Inactive products are marked, and are left out of the pickers that transact
  products.

### Create a product

- Create a product with a photo, a name, a brand, a base unit and its selling
  price, a low stock threshold, and whether it is tracked as partial.
- Give it an optional content unit — how much one base unit holds — with its own
  conversion rate and price.
- Add the owner's own units, each with a name, a basis, a conversion rate, a
  purchase/sell capability, and a price when it can be sold.

### Product detail page

- Show the product's photo, details, units and stock.
- Change the photo.
- Edit the name, brand, description, low stock threshold and track-as-partial.
- Set the selling price of the base and content units.
- Add the owner's own units.
- Change the name, selling price and purchase/sell capabilities of the owner's
  own units.
- Deactivate or reactivate the product.

## API endpoints

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
   -> 200 UnitsResponse
```

### GET /api/businesses/:businessId/products

Lists a business' products, newest first, each with its units and whether it
is active.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware checks the owner owns :businessId
      and resolves the business' default branch
   -> repository returns the products for that scope, newest first,
      each with its units
   -> service converts decimals to plain numbers and attaches the
      image id taken from each product's live image claim
   -> 200 ProductSummaryResponse[]
```

An empty catalog is a `200` with an empty list, not a `404`. The grid lists the
names of every unit a product can be sold in, custom ones included.

### POST /api/businesses/:businessId/products

Creates one product with its units and image claim, in a single transaction.

```
Client -> Authorization: Bearer <jwt> + CreateProductInput
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
   -> 201 CreateProductResponse
```

The whole thing is one transaction: a product never exists without its units,
and an unknown or conflicting unit rejects the entire creation rather than
leaving a partial product behind. A name clash only the database can see — two
requests racing, or a row added between the read and the write — is reported as
the same failure with no field attached, because the repository cannot say
which unit it was.

### GET /api/businesses/:businessId/products/:productId

Reads one product with its units and image claim.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> repository loads the product by id, scoped to the business
   -> service attaches the units and the live image claim
   -> 200 ProductWithUnitsResponse
```

### PUT /api/businesses/:businessId/products/:productId

Replaces a product's own fields. The edit form sends every field, so a cleared
value is written rather than left behind, and neither the units nor the image are
part of this request.

```
Client -> Authorization: Bearer <jwt> + UpdateProductInput
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> validation applies the shared product-fields rules: a name is required; a
      blank brand, description or low stock threshold is written as `null`; an
      absent track-as-partial reads as off
   -> repository runs one transaction:
         1. load the product, scoped to the business
         2. write the product's own fields — name, brand, description, low stock
            threshold and track-as-partial
   -> 200 UpdateProductResponse
```

Only a product's own fields move here: the units are set at creation or through
the unit request below, and the photo is changed through the product's upload
endpoint. The response is the whole product with its units, so the client can
replace its cached detail instead of merging.

### PUT /api/businesses/:businessId/products/:productId/units

Edits a product's units in one request. Each row names its `unitRole`, so one
endpoint covers the selling price of the base and content units and the name,
selling price and capabilities of the owner's custom units.

```
Client -> Authorization: Bearer <jwt> + UpdateProductUnitsInput
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> validation applies the rules for each row's role: a base or content row
      carries its id and price, while a custom row carries its id, name, both
      capabilities, and a price exactly when it can be sold
   -> repository runs one transaction:
           1. load the product, scoped to the business
           2. reject a row whose id is not one of the product's, or whose
              unitRole does not match that row
           3. update a base row's price; its name, basis, rate and role stay fixed
           4. update a content row's price or clear it with `null`; its name,
              basis, rate and role stay fixed
           5. for a custom row, write its name, price and capabilities; a unit
              being made sellable needs a price, and a row that can neither be
              bought nor sold is refused
           6. reject a custom rename that collides, ignoring case, with another
              unit on the product
           7. return the product with its units in their read order
   -> 200 UpdateProductUnitsResponse
```

A base or content unit keeps the name, basis, rate and role the platform gave it —
only its selling price moves here. A custom unit may also be renamed and change
its purchase/sell capabilities. A unit's basis and rate are never editable. A
content unit's price can be cleared with `null`; a base unit always carries one,
and a sellable custom unit must. The response is the whole product with its
units, so the client can replace its cached detail instead of merging rows.

### POST /api/businesses/:businessId/products/:productId/units

Adds one unit to a product that already exists: either one of the owner's own
units, or the product's content unit. It is the single-unit counterpart of the
units the create request carries, told apart by the `unitRole` the request names.

```
Client -> Authorization: Bearer <jwt> + CreateProductUnitInput
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> validation reads a body with no role as the older CUSTOM shape, then
      applies the rules for the role it names: a name, a basis (BASE or MOU), a
      positive rate and a price exactly when sellCapable for a custom unit; a
      standard unit and a positive rate for a content unit
   -> repository runs one transaction:
          1. load the product, scoped to the business
          CUSTOM:
             a. reject a content basis when the product has no content unit,
                so a unit is never left pointing at one that does not exist
             b. reject a name that collides, ignoring case, with any unit the
                product already carries — the base and content units included
             c. write the row as a CUSTOM unit
          MOU:
             d. reject a second content unit, since a product has at most one
             e. reject an unknown standard unit, one in the base unit's
                dimension, or one whose symbol clashes with an existing name
             f. write the row as the content unit, resolving its display name
                from the standard unit and always selling, never purchasing in
   -> 201 CreateProductUnitResponse
```

A body that names no `unitRole` is read as `CUSTOM`, so the older request shape
still works. The response is the whole product with its units, including the
row just created. A unit cannot be deleted, so the client confirms before this
is called — see the detail-page flow above.

### PATCH /api/businesses/:businessId/products/:productId/active

Activates or deactivates a product.

```
Client -> Authorization: Bearer <jwt> + UpdateProductActiveInput
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> validation requires a boolean `active`
   -> repository sets the product's active flag, scoped to the business
   -> 200 UpdateProductActiveResponse
```

Deactivating never fails, however much stock or sales history the product
carries: every line that used it already holds the product's name and units as
snapshots, so nothing downstream needs the product to stay active. An inactive
product stays in the catalog, marked inactive, but the surfaces that pick
products to transact — inventory intake and sales — leave it out;
reactivating puts it back.

### GET /api/businesses/:businessId/products/:productId/units

Returns one product's transactable units, ordered by role.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> repository loads the product by id, scoped to the business
   -> service returns its units as options, ordered by role —
      Base, MOU, Standard, Custom — then by name
   -> 200 ProductUnitOptionResponse[]
```

The options carry the role and rate a caller needs to resolve the unit to a
standard one later, plus the selling `price` so a sale line can show its unit
price before submitting. A unit that cannot be sold gives `null`. Inventory
consumes this for a batch line's "bought in" field; see
[inventory.md](inventory.md).

### POST /api/businesses/:businessId/products/uploads

Authorizes one image upload and returns where to send it. The upload starts
unclaimed — nothing ties it to a product until a create request names its id.

```
Client -> Authorization: Bearer <jwt> + CreateUploadInput
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> validation applies the shared create-upload rules (record, mimeType, size)
   -> service mints an upload id and a storage key, records the upload as
      PENDING, and returns a presigned write link
   -> 201 CreateUploadResponse
```

The client sends the bytes straight to `uploadUrl`, so they never pass through
the server.

### GET /api/businesses/:businessId/products/uploads/urls

Signs a read link for every image claimed in the business.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> middleware collects the branch's claimed image ids
   -> service, per upload: skips a failed one; re-checks an unconfirmed one
      against storage, marking it failed when missing; then signs a link
   -> 200 DownloadUrlsResponse
```

A failed or missing upload is dropped from the list rather than failing the whole
read, so one broken image never blanks the grid. The client holds the signed
links for the life of the page.

### GET /api/businesses/:businessId/products/:productId/uploads/:uploadId/url

Signs a read link for one product's image.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> middleware resolves the product's live image, ignoring the upload id
      in the path
   -> service re-checks an unconfirmed upload against storage, marking it
      failed when missing, then signs a link
   -> 200 DownloadUrlResponse
```

The address carries the product, not just an upload: the upload id in the path is
overridden by the product's live claim, so the only image this can sign is the
one the product currently shows.

### PUT /api/businesses/:businessId/products/:productId/uploads

Sets or replaces a product's photo, reusing the object it already has. The body
names the record type and the route the product, so no upload id travels in the
path or the body.

```
Client -> Authorization: Bearer <jwt> + UpdateUploadInput
   -> auth middleware resolves the owner
   -> business middleware resolves the scope and the product
   -> validation applies the shared update-upload rules (record, mimeType, sizeBytes)
   -> when the product already has an image:
        service updates that upload's reported type and size, resets its
        status to PENDING, signs a write url for its existing object
        allowing overwrite, and writes nothing else
      when it has none:
         service mints an upload, records it, claims it for the product,
         and signs a write url
   -> 200 UpdateUploadResponse
```

When the product already has a photo, the upload and its claim are left untouched
and the same object is overwritten in place: the product keeps pointing at one
image, and a replacement whose transfer never lands leaves the old photo intact,
so the product is never left without one. The first photo on a product created
without one is added here too, and is the only path that writes a new upload.

## How a product's image is attached

The endpoints are above, the module that backs them is in
[uploads.md](uploads.md), and the transfer pattern underneath them in
[../file-transfer-architecture.md](../file-transfer-architecture.md). What the
product feature adds: a photo, when one is given, is applied in the same
transaction that creates the product, so a product never exists half-created; if
it cannot be prepared the image is dropped, the reason shown, and the product is
created without it. Editing a photo reuses the product's existing object instead
of claiming a new one, so its image id does not change. A photo is never
required: every read tolerates a product without one.

Reading is shared beyond this page. The image download and its session cache
live outside this feature, so any surface that shows a product photo reuses the
same fetch, and other features read the catalog through a service the app injects
rather than importing this one.

## Limitations — custom units

- **A conversion fact cannot be changed and a unit cannot be removed.** They
  exist only inside the request that creates the product: no rate changes, no
  deletion. Display names, by contrast, are freely renamable — a label never
  enters the math. The PRD treats units as mutable configuration, so the locked
  conversion facts are a gap rather than a decision.

- **Names are per product.** The same word on two products is two unrelated
  units, and there is no template library yet (PRD Phase 3) — a business sets up
  `box = 12 pc` once per product. Names are matched case-insensitively by the
  application, while the database's own index is case-sensitive.

- **`track-as-partial` is a switch with nothing behind it.** The PRD conditions
  it on having a content unit and a sell-capable unit smaller than one base unit;
  nothing checks that, and a custom unit is exactly what would qualify one.

- **Unit order is not stable.** Creation answers in submission order, reads sort
  by role then name — harmless only as long as nothing depends on it.

- **A wrong rate has nowhere to be corrected.** The Pack Relation and each custom
  unit's basis and factor are trusted as entered — the system has no independent
  ground truth to catch a wrong multiplier, and a mistake silently corrupts
  every stock and cost figure derived from it (names are renamable; these
  conversion facts are not). See
  [../unit-system-architecture.md](../unit-system-architecture.md).

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
- [uploads.md](uploads.md) — the endpoints that carry a product's photo.
- [../schema.md](../schema.md) — the `Product`, `ProductUnit`, `Upload` and
  `Attachment` entities.
- [../file-transfer-architecture.md](../file-transfer-architecture.md) — how
  files are uploaded, downloaded and tracked.
- [../unit-system-architecture.md](../unit-system-architecture.md) — the unit
  model, the conversion math, and the integrity limits of the schema.
