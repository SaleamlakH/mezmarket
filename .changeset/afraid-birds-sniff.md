---
'@mez/validation': minor
---

Validate the inventory expiry cutoff query

- Added `productInventoryListQuerySchema` and `productInventoryDetailQuerySchema`,
  with their `validateProductInventoryListQuery` and
  `validateProductInventoryDetailQuery` parsers, for the optional `expiryBefore`
  cutoff shared by both inventory reads. A malformed instant is rejected; an
  absent or blank cutoff reads as no filter.
