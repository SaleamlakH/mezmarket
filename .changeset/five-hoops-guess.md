---
'@mez/types': minor
---

Add dashboard reporting and filtered-list contracts

- Added dashboard reporting types for attention, summary, trend, member
  performance, payment-method summary, and their period/query helpers.
- Added `InventoryExpiryStatus`, nested expired/soon `ProductInventoryExpiry`
  groups with earliest expiry dates, and inventory list stock/expiry filters.
- Added batch list status and filter contracts.
- Extended `SaleListFilters` with multiple statuses, payment date bounds,
  unpaid, and overdue;
- Added `taxAmount`, `amountPaid`, and `balanceDue` to sale
  summary responses.
