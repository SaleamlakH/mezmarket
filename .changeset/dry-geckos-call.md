---
'@mez/validation': minor
---

Add dashboard reporting and list-filter validation

- Added period, dashboard summary, member performance, payment summary, and
  trend query schemas, including the 366-day period limit and hourly trend
  limit.
- Added sale-list validation for comma-separated payment statuses, sale and
  payment date ranges, unpaid, and overdue.
- Added inventory list validation for stock status and expiry status, allowed
  together with `expiryBefore`, plus the batch list status schema.
- Added parser tests for reporting, sales-list, inventory-filter, and batch-list
  validation.
