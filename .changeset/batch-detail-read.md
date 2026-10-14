---
'api': minor
---

Read one batch and one product inventory detail by id

- Added `GET /api/businesses/:businessId/inventory/batches/:batchId`, returning a
  batch's details and product lines scoped to the caller's business and branch.
- Added `GET /api/businesses/:businessId/inventory/products/:productId`, returning
  a product's stock summary plus every batch it appeared in, newest batch first,
  with that product's lines under each batch.
- Both reads are open to every member; an unknown or out-of-scope id answers
  `404`. The product detail also reads inactive products, so a deactivated
  product's history stays available.
