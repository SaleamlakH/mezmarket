# Inventory

## Purpose

Recording what arrives. A batch is one purchase event — a date, an optional
supplier and reference, and one or more product lines — and recording it is
what puts stock on the shelf. This feature covers that: creating a batch,
listing a business' batches, and reading the stock position of every product.

It is the counterpart to the catalog in [products.md](products.md). The catalog
defines what a product is and the units it trades in; inventory is where those
units are bought and counted. A product's stock is not entered directly — it is
a cached value that starts at zero and is incremented when a batch line is
recorded.

## Concept model

- A batch always belongs to exactly one business and one branch. Both are
  derived server-side from the resolved session and are never accepted from the
  client, so a caller can only ever see or create stock inside a business they
  actually belong to. Reads are open to any member; only the write is gated on
  the Owner or Manager role.

- A batch is recorded confirmed. `confirmedAt` is set to the moment it is
  written, so there is no editable draft in this feature: a recorded purchase
  is a fixed event, and correcting one means recording another, not revising it.

- A batch line names one product and one **purchase-capable** unit of it — the
  base unit, its content unit, a same-dimension standard unit, or one of the
  owner's own. The unit's label, the standard unit it resolves to, and the
  quantity in that standard unit are all **snapshotted** onto the line as it is
  written, so what a purchase meant is fixed even if the unit's configuration
  changes later. Only a link back to the current unit is kept, and it is for
  tracing, never for redisplaying history.

- A line carries its quantity and cost as entered, plus the standard quantity
  that feeds stock. The purchase's cost is `purchaseQuantity × purchaseUnitCost`
  — two fields already on the row — and is derived wherever it is needed rather
  than stored.

- Stock is counted per product, not per line. Several lines of the same product
  in one batch are added up into a single increment and applied once, in the
  product's base unit, to `currentSealedStock`.

- The product view summarises each active product: on-hand stock, a low/out/in
  status against its threshold, the remaining cost of the stock still held, how
  many lots expire by the caller's cutoff and how much they hold, how many
  batches still hold stock of it, and its photo. A **lot** is one batch line that
  still has quantity remaining.

## Frontend UI flow

- Browse recent batches and open the full batch list.
- Browse every product's stock position, value, status, and lots expiring within
  seven days.
- Open a product for its stock by purchase unit, expiry warning, and purchase
  history grouped by batch.
- Follow a batch from a product's history to the batch record.
- Record a batch with its date, supplier, and reference, then add product lines.
- Pick products from the catalog and choose a purchase-capable unit for each
  line, see the running total while building a batch, then Confirm to add the stock
  and refresh the listings; close to discard the draft.

## Request flow

### GET /api/businesses/:businessId/inventory/batches

Lists a business' recorded batches, newest batch date first.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware checks the caller belongs to :businessId
      and resolves the business's default branch
   -> repository returns that scope's batches,
      newest batch date first, each with its lines and receiver
   -> service flattens each product's name and brand onto its line
   -> 200 StockBatchDetailResponse[]
```

An empty history is a `200` with an empty list, not a `404`.

### GET /api/businesses/:businessId/inventory/batches/:batchId

Reads one recorded batch, in the same shape the list returns for it.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware checks the caller belongs to :businessId
      and resolves the business's default branch
   -> repository returns that scope's batch by id, with its lines
      and receiver
   -> service flattens each product's name and brand onto its line
   -> 200 StockBatchDetailResponse
```

An unknown id, or one outside the caller's business or branch, is a `404`, so
the endpoint never reveals a batch the caller could not already list.

### POST /api/businesses/:businessId/inventory/batches

Records one purchase and adds its stock, in a single transaction.

```
Client -> Authorization: Bearer <jwt> + JSON body
   -> auth middleware resolves the owner
   -> business middleware resolves the business and default branch
   -> role middleware requires the acting member to be Owner or Manager
   -> validation middleware applies the shared create rules
   -> service loads the catalog for the products named, then for each line:
         - rejects a product the business does not have
         - rejects a unit that is not that product's
         - rejects a unit the product cannot be bought in
         - snapshots the purchased unit, its standard unit, the
           standard quantity, and the stock it adds in base-unit terms
   -> repository runs one transaction:
         1. insert the batch, confirmed, against the acting member
         2. insert one line per product line
         3. increment each product's sealed stock by the sum of its
            lines' base-unit quantities
   -> 201 StockBatchDetailResponse
```

The whole thing is one transaction: a batch never exists without its lines, and
the lines and the stock they add move together. An unknown product or an
unusable unit rejects the entire recording rather than leaving a partial batch
or a half-applied increment behind.

### GET /api/businesses/:businessId/inventory/products

Summarises the stock position of every active product.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> validation middleware reads the optional expiry cutoff
   -> repository returns the active products of that scope and branch,
      each with its base unit and the lines still holding stock
   -> service attaches the live image of each product and computes, per product:
         - stock status against the low-stock threshold
         - the remaining cost of the stock still held
         - the lots expiring by the cutoff, and their quantity in base units
         - how many batches still hold stock of it
   -> 200 ProductInventorySummaryResponse[]
```

`GET .../inventory/products?expiryBefore=<ISO instant>` sets the cutoff. Without
it the API uses the moment of the request, so already-expired lots still count.
Only lines with quantity remaining are lots; a line with no expiry is never
counted.

Status reads the threshold the product was configured with: zero or less is out
of stock, below the threshold is low, anything else is in stock. A product with
no threshold has no level to be low against and is never reported low.

### GET /api/businesses/:businessId/inventory/products/:productId

Reads one product's stock position and the full history of batches it appeared
in, newest batch date first.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> validation middleware reads the optional expiry cutoff
   -> repository returns the product of that scope and branch with its
      base unit and every line of it, each carrying the batch it belongs to
   -> service attaches the live image of the product, computes the stock
      header and the expiry totals of the lines still holding stock, and
      groups the lines under the batch that carried them, newest first
   -> 200 ProductInventoryDetailResponse
```

`GET .../inventory/products/:productId?expiryBefore=<ISO instant>` sets the
expiry cutoff. The cutoff follows the list: without it the API uses the moment
of the request, and already-expired lots still count.

Batches are returned newest first; lines keep the order they were recorded in.
Each line also carries `baseUnit`, `remainingPurchaseQuantity` (how much of the
bought unit is left) and `remainingCost` (what that stock cost), so the client
does not re-derive either.

The header is returned for an inactive product too, and a batch is listed
whether or not its line still holds stock, so a product's purchase history
stays complete. An unknown id, or one outside the caller's business or branch,
is a `404`.

### GET /api/businesses/:businessId/products

Returns a business' products, for the add-batch picker.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the business and default branch
   -> repository returns the scope's products, ordered by name
   -> service attaches the base unit label and the live image of each
   -> 200 ProductSummaryResponse[]
```

This belongs to the products feature (see [products.md](products.md)), but the
add-batch dialog is its consumer here, reached through the injected catalog
service: the picker offers every product in the catalog, so nothing is filtered
out once a product has been used — a delivery can legitimately carry the same
product twice in different units. The catalog is kept for the life of the dialog
and never re-requested, since it effectively does not change while a batch is
being entered.

### GET /api/businesses/:businessId/products/:productId/units

Returns one product's transactable units, for a batch line's "bought in" field.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> repository loads the product by id, scoped to the business
   -> service returns its units as options, ordered by role —
      Base, MOU, Standard, Custom — then by name
   -> 200 ProductUnitOptionResponse[]
```

Also part of the products feature, called here through the injected catalog
service when a line is opened. The line form offers only the units flagged
`purchaseCapable`, and the options carry the role and rate the server later needs
to resolve the line to a standard unit. The result is likewise held for the
dialog's life. See [products.md](products.md).

## How a purchase becomes stock

A purchase is always snapped in the standard unit of the unit it was bought in,
while stock is always counted in the product's base unit. The two differ when
the purchase is made in a same-dimension unit or in the owner's own — a purchase
of `5 L` next to a `ml` base snapshots `5 L`, while the `5,000 ml` it is worth
is what lands in stock.

Resolving a line walks the product's unit hierarchy once, and which way it walks
depends on the role of the unit bought:

- A base, content or standard unit carries the standard unit it resolved to, so
  the line snapshots that unit and the quantity as entered.
- One of the owner's own has no standard unit of its own. It is measured against
  the base or content unit it was based on, and its rate is how much of that
  basis one of it is worth, so it resolves by multiplying (`shot = 25 ml`,
  `slice = 0.125 pc`). Reaching base-unit stock from a content-based custom unit
  takes one further hop.
- A content unit's rate is the product's pack relation (one base unit holds so
  many of it), so moving from it divides rather than multiplies.

Every step lands on a standard unit in one move, and stock always lands in the
base unit. A unit whose rate, basis or standard unit is missing means the
catalog is broken rather than the request, and the recording fails rather than
guessing a conversion.

## Limitations

- **Nothing can be changed or removed.** A recorded batch has no edit or delete
  path, and there is no way to override a specific line with a reason. A mistake
  can only be answered by recording another batch, and nothing is written to the
  audit log.

- **There is no draft state.** `confirmedAt` is always set on creation, so the
  freely-editable draft the schema allows for is never produced.

- **Stock draws are whole-unit only.** A line is written with its remaining
  quantity set to the stock it added, in the product's base unit, and draw and
  restore both move that figure in whole base units. The partial-container flow
  the units otherwise allow for — drawing from an opened bottle rather than a
  sealed one — is not recorded against a lot, so every draw is taken from sealed
  stock.

- **A line whose purchase unit is missing drops its cost silently.** A line's
  `remainingCost` is derived from the quantity bought, converted to base units
  through the unit's live conversion facts and scaled by the fraction still
  unsold. A line whose purchased unit is no longer among the product's units has
  no rate to convert with, so it contributes nothing and the product's
  `totalCost` is understated — with no error and no marker on the response.
  Units cannot currently be deleted, so this is a defensive branch rather than a
  reachable state, but the summary would not surface it if it ever happened.

- **Lists are unbounded.** A branch's batches and products are returned whole,
  with no pagination or limit, so the reads scale with the size of the catalog
  and its history.

- **Inactive products disappear.** The product view returns only active
  products, so a deactivated product's stock, however much is on hand, is not
  shown anywhere in this feature.

- **Purchases are not restricted by dimension.** Any purchase-capable unit may
  be bought, content-based and owner-defined ones included, even though intake
  represents sealed packages arriving. Whether a purchase should be limited to
  base-dimension units is an open question in the schema, not yet decided.

## Error concepts

- Unauthenticated request: the identity cannot be established.
- Not your business: the business is not one the caller belongs to, or it has no
  branch to scope to.
- Forbidden: the acting member's role is neither Owner nor Manager, on the
  recording path only.
- Invalid payload: fails the shared validation rules, reported with per-field
  detail.
- Product not found: a line names a product the business does not have.
- Unit not on product: the chosen unit is not one of that product's units.
- Unit not purchasable: the chosen unit cannot be bought.
- Broken catalog: a unit is missing its standard unit or conversion rate, or a
  product is missing its base unit, both reported as internal errors.

Every failure is delivered as a structured error envelope by the global error
handler; see [error-handling.md](error-handling.md).

## Design rationale / invariants

- **Scope is derived, never trusted.** Business, branch and the acting member
  come from the resolved session, so a caller cannot read or write stock outside
  a business they belong to. Reads are open to every member; only recording is
  gated on the Owner or Manager role.

- **A batch and the stock it adds are one unit of work.** The batch, its lines,
  and every product's increment are written in a single transaction, so a
  recorded purchase can never exist without the stock it was supposed to add.

- **What was bought is snapshotted, never recomputed.** The purchased unit, its
  standard unit and the standard quantity are frozen onto the line, so a later
  change to a unit's name or rate can never rewrite what a past purchase meant.
  The catalog is read live only to resolve a new line, never to re-derive an old
  one.

- **Stock is counted per product.** The lines of one product in a batch are
  summed into a single increment, so the cached total moves once and cannot
  drift line by line.

- **One set of rules, form and server.** The same shared validation runs over
  the batch form and the request payload, so a batch the client accepts is not
  rejected on save.

- **The dialog fetches lazily and forgets on close.** The picker's catalog and a
  product's units are requested only when those steps are opened and are dropped
  when the dialog closes, so nothing is fetched or kept that the session does not
  need.

- **Catalog reads go through an injected service.** Inventory declares the reads
  it needs and the app binds the products feature's implementation at the
  composition root, so features never import each other and the catalog source
  can change without touching this feature.

- **An image is downloaded once and shown everywhere.** Photos resolve through a
  session-wide cache keyed by upload id, so the same image is not re-fetched per
  surface or per visit.

## Cross-references

- [products.md](products.md) — where a product and its transactable units come
  from, and the unit roles this feature resolves through.
- [business.md](business.md) — where the business and its default branch come
  from.
- [auth.md](auth.md) — how the acting owner is resolved.
- [error-handling.md](error-handling.md) — the structured error envelope.
- [../prd.md](../prd.md) — inventory intake and the unit system's rules
  (§3.3, §4.2, §5).
- [../schema.md](../schema.md) — the `StockBatch`, `StockBatchLine` and
  `ProductUnit` entities.
- [../unit-system-architecture.md](../unit-system-architecture.md) — the unit
  model, conversion math, and the integrity limits of the schema.
- [../architecture.md](../architecture.md) — overall system design.
