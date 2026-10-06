---
'api': minor
---

Implement product creation and fetching

- `POST /businesses/:businessId/products` creates a product with its units in a single transaction.
- `GET /businesses/:businessId/products` and `GET /businesses/:businessId/products/:productId` fetch the catalog and a single product.
- `GET /units` provides the standard units reference data.
