# Products

## Purpose

The catalog. A product is the thing a business buys, stocks and sells; this
feature creates one, lists a business' products, and reads a single product
back. Every product is permanently attached to the units it is traded in, and
can carry a single photo.

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

- A product carries its own units as separate rows rather than as columns, so
  the base unit, the content unit, and any further unit added later are all
  the same kind of thing. A product always has exactly one base unit, and at
  most one content unit.

- The base unit is required. The content unit is optional and only means
  something once a unit is chosen for it: it records how much content one base
  unit contains, such as one piece being 350 ml.

- When both a base unit and a content unit are present they must be different
  units _and_ belong to different dimensions. Two units from the same
  dimension cannot express a conversion, so accepting them would store a
  meaningless rate.

- A content unit exists for a reason: it marks the product as being opened and
  sold in parts, such as a shot or a slice.

- Stock is not entered when a product is created. The stock figure a product
  carries is a cached, derived value that starts at zero and is recomputed from
  stock receipts, sales and losses as those happen — so a newly created
  product always shows zero stock.

- A product is created active, and only active products are listed. There is
  no way to change or remove a product yet.

## Frontend UI flow

The Products page shows the catalog as a grid of cards, newest first. Each
card carries the product's name, the units it can be sold in, its price, and
its current stock — which is highlighted once it reaches the low stock
threshold, when one is set.

```
Products page
      │
      ▼
  ┌───────────┐
  │  Loading  │
  └───────────┘
      │
  ┌───┴───────┐
  ▼           ▼
Error      No products
(retry)         │
  │        Add product
  ▼           │
  └─────┬─────┘
        │
        ▼
    ┌─────────┐
    │  Grid   │ ◀── Add product
    └─────────┘
        │
        ▼
  Add product dialog
```

Opening the dialog resets the form. The photo control comes first, then the
name and brand, the base unit and its price, a collapsible content unit
section, the low stock threshold, and the track-as-partial switch. Submitting
closes the dialog, raises a confirmation, and puts the new product at the top
of the grid; a failure keeps the dialog open with everything the user entered
and an error above the form.

```
        ┌──────────────────────┐
        │  Add photo (optional) │
        └──────────────────────┘
          │          │     │      │
     pick file   invalid  auth    remove / replace
          │          │  failed      │
          ▼          ▼     │      │
     ┌─────────┐   (rejected,     │
     │ Preview │  file cleared)  │
     └─────────┘       │          │
          │            └────┬─────┘
          │                 ▼
          │          (message shown)
          │                 │
          └────────┬────────┘
                   ▼
            (back to placeholder)
```

The preview appears as soon as a file is chosen, before the server has answered
— so a photo can be shown and then taken away a moment later if the request
behind it fails. Submitting is not blocked by that request: the form waits for
it, and if it failed the product is still created, just without the image.

The content unit section starts collapsed, since most products do not need one.
Once it has an error, the error is shown even while collapsed, so a problem is
never hidden behind a section the user has not opened. Changing either unit
re-checks the content unit immediately, because the two conflict rules depend
on what the base unit is.

## Request flow

### GET /api/units

The platform's standard units, grouped into their dimensions. This is the only
endpoint that does not require authentication — the units are reference data
shared by every business, not tenant data. The client holds the result for the
life of the page, since standard units effectively never change.

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

An empty catalog is a `200` with an empty list, not a `404`.

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
        7. insert the image claim, when an image was requested
   -> 201 { product, units, uploadId }
```

The whole thing is one transaction: a product never exists without its units,
and an unknown or conflicting unit rejects the entire creation rather than
leaving a partial product behind.

### GET /api/businesses/:businessId/products/:productId

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> repository loads the product by id, scoped to the business
   -> service attaches the units and the live image claim
   -> 200 { product, units, uploadId }
```

## Shared contract

The product shape, its creation request and its responses are defined once in
a shared contract package, so the API and the client agree without drift.

Validation rules are shared too, and this is where the two ends differ
slightly. The same base rules run on both, but the client's copy carries an
extra derived field per unit — which dimension a chosen unit belongs to — so
the "different dimension" rule can be reported against the content unit field
while the user is still filling the form in. The client copy then transforms
back down to exactly the payload the server accepts, and the server re-derives
and re-checks the dimension rule itself from the units it looked up. The rule
is therefore enforced in both places without the client having to send
anything the server would trust.

| Field                | Type    | Rules                                                 |
| -------------------- | ------- | ----------------------------------------------------- |
| `name`               | string  | required, trimmed, 1–100 characters                   |
| `brand`              | string  | optional, trimmed, at most 50 characters              |
| `description`        | string  | optional, trimmed, at most 500 characters             |
| `categoryId`         | string  | optional, non-empty when present                      |
| `lowStockThreshold`  | number  | optional, at least 0, in base unit terms              |
| `trackAsPartial`     | boolean | optional                                              |
| `baseUnit.unitId`    | string  | required, must resolve to an existing standard unit   |
| `baseUnit.price`     | number  | required, greater than 0                              |
| `mou.unitId`         | string  | optional, must differ from the base unit              |
| `mou.conversionRate` | number  | required when a content unit is given, greater than 0 |
| `mou.price`          | number  | optional, at least 0                                  |
| `uploadId`           | string  | optional, the image to attach                         |

Blank optional fields are dropped rather than sent as empty values, so an
untouched field stays absent instead of overwriting stored data with nothing.
Validation failures are reported with per-field detail; see
[error-handling.md](error-handling.md).

## How a product's image is attached

The transfer itself — presigned links, the upload's state, and how a file
moves between the browser and storage — is covered in
[../file-transfer-architecture.md](../file-transfer-architecture.md). What the
product feature adds is only this:

- **Choosing a photo** validates it against the shared upload rules — accepted
  image formats only, no larger than 10 MB — previews it locally, and
  authorizes it immediately, which records the claimed type and size and
  returns a write link. A file that fails validation is discarded before any
  request is made.
- **Submitting** waits for that authorization if it is still in flight, then
  sends the bytes to storage and creates the product with the resulting image
  id, its claim written in the same transaction as the product.
- **Reading** surfaces each product's image id in the product list; one request
  signs download links for the business's images, and each card downloads its
  own on first appearance and keeps it for the rest of the page's life.

A selection that is replaced or cleared abandons the authorization it already
obtained, and a superseded one is discarded rather than applied to the form. An
authorization that fails drops the image and explains why in its place, leaving
the form usable and the product created without it.

The one thing the transfer architecture calls for that is not implemented here
is its reconciliation and cleanup — the periodic pass that would collect
transfers which never resolved and uploads nothing claims. See the limitations
below.

## Limitations — image handling

### Trust and correctness

- **The claimed type and size are never checked against what was actually
  stored.** The type and size sent when requesting an upload come from the
  browser, are recorded as given, and the stored file's extension is derived
  from that claimed type. Nothing inspects the object afterwards to confirm
  it really is an image of that type and size. A client that skips the
  browser-side check can store a non-image, or a file well over the limit,
  under an image name — and the app has no way to notice.

- **A failed transfer is indistinguishable from a missing one.** Two things
  have to succeed for an image to reach storage, and they are handled
  differently. The authorization is reported: if it fails, the photo is dropped
  and the reason is shown where the photo was, so the user finds out. The
  transfer itself is not — the bytes are sent alongside the product creation
  and deliberately not awaited, so its outcome is not part of that call. A
  transfer that fails therefore leaves a product whose image can never load,
  and the user is told nothing at any point.

### Lifecycle and cleanup

- **Unclaimed uploads are expected here, and nothing collects them.** The
  transfer architecture treats an upload nothing claims as normal — a photo
  chosen, authorized, and then replaced or abandoned before the form was
  submitted — and assigns it to a periodic reconciliation pass, alongside a
  storage-side expiry for unconfirmed files. None of that is implemented; the
  application schedules no such work. So the normal case of changing your mind
  about a photo leaves a record behind every time, and nothing ever resolves or
  removes it. It cannot even resolve itself the way a live image does, because
  the lazy check only runs when someone asks for that image — which for an
  unclaimed one, nobody ever does. Note that a replaced selection never sends
  its bytes, so these are records rather than stored files; a submission that
  failed after the bytes were sent is the case that can also leave an object
  behind.

- **The write link is spent long after it is issued.** Authorization is
  requested when the photo is chosen, but the link it returns is not used
  until the form is submitted, and nothing re-requests it if it has expired in
  the meantime. A dialog left open for a long time has no upper bound on that
  gap. The transfer architecture sets out how long a _download_ link lives but
  says nothing about upload links, so there is no stated policy to hold this to
  either. The read side avoids the equivalent problem by caching the bytes and
  forgetting about expiry; the write side has no equivalent protection.

- **Soft deletion is read but never written.** Removing a claim is modeled as
  a soft delete and every read ignores removed claims, but nothing in this
  feature ever sets that marker — there is no way to change or remove a
  product's image.

### Media processing

- **Images are stored and served exactly as uploaded.** Because the bytes go
  directly from the browser to storage, the file never passes through the
  application, so there is no resizing, thumbnailing, cropping, format
  conversion or metadata stripping. Whatever was uploaded is what every
  consumer downloads.

- **Every image is a full-size download.** The grid asks for the same original
  for every product it displays. There are no size variants, so the cost of
  showing an image does not depend on how small it is actually rendered.

### Read path and client cost

- **Signing covers the whole catalog at once.** Loading the grid issues a
  single request that signs a download link for the image of _every_ product
  in the business, with no paging — including products far below the fold, and
  products with no image consumer currently on screen. The product list itself
  is likewise fetched in one unbounded request.

- **The browser holds every image it has ever shown, for the life of the
  page.** Downloaded images are kept in an in-memory cache keyed by image, with
  no eviction, no size cap and no persistence. Revisiting the catalog is
  instant, at the cost of memory that only a full page reload clears. A large
  catalog of large images is held in full.

## Error concepts

- Unauthenticated request: the identity cannot be established.
- Not your business: the business is not one the owner owns, or it has no
  branch to scope to.
- Invalid payload: fails the shared validation rules, reported with per-field
  detail.
- Unusable unit: the base or content unit does not exist, or a content unit
  was given in the base unit's dimension.
- Not found: the product does not exist within the resolved scope.
- No image: a specific image was asked for and the product has no live claim
  for it, or its claimed image turned out not to exist.
- Storage unavailable: storage is not configured in the deployment, or a link
  could not be signed.

Every failure is delivered as a structured error envelope by the global error
handler; see [error-handling.md](error-handling.md).

## Design rationale / invariants

**Scope is derived, never trusted.** Business and branch come from the
resolved session, so a caller has no way to read or create a product outside a
business they own. The image follows the same rule: a download link is never
issued for an image a caller named, it is resolved from the target product's
own claim, so a request can only ever reach an image that product actually
uses. Possession of an image id is the capability, which is why the ids are
generated rather than chosen.

**Validation rules live in one place.** The form and the server share the same
rules, so the two can never drift about what a valid product is. The client
enriches its copy only with what it can derive locally, and sends the same
payload either way.

**A product and its units are one unit of work.** The product, its base unit,
its optional content unit, and its image claim are written in a single
transaction, so a product can never exist in a state where half of it is
missing.

**Authorization is requested early, but only ever applied once.** Asking as soon
as a photo is chosen gets it out of the user's way, so the rest of the form can
be filled in without an image request in the middle of it. The submission still
waits for that request rather than racing it, which is what keeps a product's
bytes and its image reference from splitting across two different uploads, and
an authorization belonging to a selection that has since been replaced or
cleared is dropped instead of being applied to whatever is on screen now.

**A photo that cannot be prepared is not a reason to block the form.** When the
request behind a chosen photo fails, the image is dropped and the reason is
shown in its place, and the product is still created. Losing one optional image
is a smaller failure than refusing to add the product at all.

**Images are fetched per image, not per screen.** Each card owns its own
download, so a slow or broken image neither blocks nor fails its neighbours,
and one that lands fills in just that card. That isolation is also what lets a
transient failure recover on its own: each image is retried independently
rather than the grid failing as a unit. The shared signing request is fetched
once and read by every card.

**A repeat visit re-downloads nothing.** The cache is consulted before a
download is even considered, which is what lets short-lived links be the right
choice — and because an image id points at one immutable object, a cached
image is always still correct.

## Cross-references

- [auth.md](auth.md) — how the acting owner is resolved.
- [business.md](business.md) — where the business and its default branch come
  from.
- [error-handling.md](error-handling.md) — the structured error envelope.
- [../architecture.md](../architecture.md) — overall system design.
- [../schema.md](../schema.md) — the `Product`, `ProductUnit`, `Upload` and
  `Attachment` entities.
- [../file-transfer-architecture.md](../file-transfer-architecture.md) — how
  files are uploaded, downloaded and tracked.
