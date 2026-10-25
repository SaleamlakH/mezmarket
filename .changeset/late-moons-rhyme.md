---
'@mez/validation': minor
'@mez/types': minor
'api': minor
'web': minor
---

Treat tax rates as percentages and only add tax when tax on sales is enabled

- Tax rates are now percentages everywhere: `15` means 15%
- Added `taxOnSales` and removed `TaxDisplayMode` from the shared business
  contracts. Sales are taxed only when the business enables tax on sales.
- Enabling tax on sales requires a rate between 1 and 50.
- `taxRateApplied` snapshots the percentage rate, or `0` when tax is off.
- Updated the API totals, web previews and invoice labels to use percentage
  rates consistently.
- Added a migration for the new column and rate precision
