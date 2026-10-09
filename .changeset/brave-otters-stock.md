---
'api': minor
---

Add inventory and batch intake endpoints

- Added authenticated endpoints
  - `GET/POST /api/businesses/:businessId/inventory/batches`
  - `GET /api/businesses/:businessId/inventory/products` (per-product stock summary);
- Split a product's units into `GET /api/businesses/:businessId/products/:productId/units`.
