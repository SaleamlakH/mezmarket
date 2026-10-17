---
'api': minor
---

Implement the sales, customer and member endpoints

- Added the sales endpoints
  `POST/GET /api/businesses/:businessId/sales`,
  `GET /api/businesses/:businessId/sales/:saleId`, and
  `POST /api/businesses/:businessId/sales/:saleId/payments`.
- Added the customer endpoints
  `GET/POST /api/businesses/:businessId/customers`.
- Added the business member endpoint
  `GET /api/businesses/:businessId/members`, filterable by role.
- Confirming a sale snapshots each line, draws stock FIFO from the oldest
  purchase lots with per-lot cost allocation, applies an optional whole-sale
  discount and the business tax rate, and writes everything in one transaction;
  recording a payment recomputes `amountPaid`, `balanceDue` and
  `paymentStatus`.
- Returned the selling price from the product units endpoint.

### Fixes

- Fixed batch line cost and remaining stock to be computed in base units:
  a new lot now seeds `quantityRemaining` with the base-unit quantity it adds
  (instead of 0), a line's remaining cost is prorated over the base-unit
  quantity bought rather than `standardQuantity`, and a line whose purchased
  unit is no longer on the product is skipped (cost 0) instead of failing the
  whole product inventory summary
