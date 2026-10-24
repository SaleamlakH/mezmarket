---
'api': minor
---

Add dashboard reporting and reporting filters

- Added authenticated endpoints:
  - `GET /api/businesses/:businessId/dashboard/attention`
  - `GET /api/businesses/:businessId/dashboard/summary`
  - `GET /api/businesses/:businessId/dashboard/trend`
  - `GET /api/businesses/:businessId/members/:memberId/performance`
  - `GET /api/businesses/:businessId/payments/summary`
- Added attention reporting for low/out-of-stock products, expired/expiring
  lots, unpaid sales, and manager-visible draft batches.
- Added period reporting for sales, cash collected, outstanding balances, losses,
  gross profit, member performance, payment-method breakdowns, and trend. Trend
  is manager-only, and manager-only summary fields are omitted for staff.
- Added stock and expiry filters to
  `GET /api/businesses/:businessId/inventory/products`: `status`, `stockStatus`,
  `expiryStatus`, and `expiryBefore`, including combined stock/expiry filters and
  the nested expired/soon expiry breakdown.
- Added sale-history filters to `GET /api/businesses/:businessId/sales`:
  comma-separated `status`, inclusive `from`/`to` on sale datetime, inclusive
  `paymentFrom`/`paymentTo` on payment date, `productId`, `unpaid`, and
  `overdue`. The list always excludes voided sales, and summaries expose
  `taxAmount`, `amountPaid`, and `balanceDue`.
- Added `groupBy=method` to the payment summary, with each method's total, payment
  count, and share of the period.
- Member performance allows managers to read any member in the branch; staff can
  read only themselves.
