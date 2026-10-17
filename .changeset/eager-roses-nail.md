---
'@mez/validation': minor
---

Add sales, customer and member validation

- Added the sales Zod schemas and parsers: `createSaleSchema`,
  `updateSaleSchema`, `voidSaleSchema`, `refundSaleSchema`, the payment rules,
  and their `validateX` helpers.
- Added `createCustomerSchema` for customer creation inputs.
- Added `memberListQuerySchema` for the member list filter.
