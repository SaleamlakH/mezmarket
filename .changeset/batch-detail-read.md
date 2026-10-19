---
'api': minor
---

Read a batch, a product inventory detail, and total expiry against a cutoff

- Added `GET /api/businesses/:businessId/inventory/batches/:batchId`, returning a
  batch's details and product lines scoped to the caller's business and branch.
- Added `GET /api/businesses/:businessId/inventory/products/:productId`, returning
  a product's stock summary plus every batch it appeared in, newest batch first,
  with that product's lines under each batch.
- Both inventory reads — `GET .../inventory/products` and
  `GET .../inventory/products/:productId` — accept an optional
  `expiryBefore=<ISO instant>` cutoff and return `expiry`, the number of lots
  expiring by then and the stock they hold in base units. Without it the API uses
  the moment of the request, so already-expired lots still count.
- Both reads are open to every member; an unknown or out-of-scope id answers
  `404`. The product detail also reads inactive products, so a deactivated
  product's history stays available.

### Fixes

- Mounted the business routes once; they were registered twice.
