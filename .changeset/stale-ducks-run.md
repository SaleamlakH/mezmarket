---
'@mez/types': minor
---

Define the sales, customer and member contracts

- Added the sale contracts: `CreateSaleInput`, `UpdateSaleInput`,
  `RecordPaymentInput`, `VoidSaleInput`, `RefundSaleInput`,
  `SaleDetailResponse`, `SaleSummaryResponse`, `SaleInvoiceResponse`,
  `SaleListFilters`, and the sale line, payment and form-value types.
- Added the customer types: `Customer`, `CustomerResponse`, `CustomerSummary`,
  `CustomerSummaryResponse`, `CreateCustomerInput`, `CustomerFormValues`,
  `CreateCustomerResult` and `CreateCustomerResponse`.
- Added the `MemberListFilters` member type.
- Added the selling `price` to `ProductUnitOption`.
