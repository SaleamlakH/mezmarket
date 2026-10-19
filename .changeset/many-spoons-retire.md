---
'@mez/types': minor
---

Add the product inventory detail contracts and expiry totals

- Added the product inventory detail contracts: `ProductInventoryDetail`,
  `ProductInventoryDetailResponse`, and `ProductInventoryBatch(Line)(Response)`,
  describing a product's batches with that product's lines under each.
- Replaced the single `earliestExpiry` with `ProductInventoryExpiry`
  (`{ lotCount, quantity }`) on the inventory list and detail, measured against
  the caller's cutoff.
- Added `ProductInventoryListFilters` and `ProductInventoryDetailFilters` for the
  optional `expiryBefore` cutoff.
