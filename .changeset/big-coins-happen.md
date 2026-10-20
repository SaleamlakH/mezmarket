---
'@mez/validation': minor
---

Add product edit, unit and upload validation

- Added `updateProductSchema` for full product field updates.
- Added `updateProductActiveSchema` for activation and deactivation requests.
- Added `productListQuerySchema` and the product list status values.
- Added `createProductUnitSchema` for adding content and custom units.
- Added `updateProductUnitsSchema` for bulk unit edits across base, content and custom units.
- Added `updateUploadSchema` and the update-upload client input type.
- Added parsers for the new product, unit and upload schemas.
