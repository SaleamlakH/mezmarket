---
'api': minor
---

Add product editing, availability and unit management

- Added `PUT /api/businesses/:businessId/products/:productId` to replace a product's own fields.
- Added `PATCH /api/businesses/:businessId/products/:productId/active` to activate or deactivate a product.
- Added `POST /api/businesses/:businessId/products/:productId/units` to add a content unit or one of the owner's custom units.
- Added `PUT /api/businesses/:businessId/products/:productId/units` for bulk unit edits, covering base and content unit prices plus custom unit names, prices and capabilities.
- Added product list status filtering through `status=active|inactive|all`, defaulting to active.
- Added `PUT /api/businesses/:businessId/products/:productId/uploads` to set or replace a product photo, reusing the existing upload and object.
