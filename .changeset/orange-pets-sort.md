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
