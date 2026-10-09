---
'@mez/types': minor
---

Add batch inventory contracts and auth session-change support

- Added the batch contracts (`StockBatch`, `StockBatchLine`, and their create/update inputs and responses).
- Added the inventory summary shapes (`ProductInventorySummary`, `StockStatus`) and `ProductUnitOption`.
- Added `onAuthStateChange` to `AuthService` with an `AuthStateListener`, so the client can react to sign-in, sign-out, and token refresh.
