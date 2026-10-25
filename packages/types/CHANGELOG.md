# @mez/types

## 0.1.0

### Minor Changes

- 41ff669: Implement owner profile viewing and editing

  - **api**: Added an owner module with authenticated GET/PUT `/api/owner`
    endpoints, backed by the shared owner types, plus a validation middleware
    for the update payload.
  - **@mez/types**: Added the shared owner request (input) and response types.
  - **@mez/validation**: Added the owner profile update Zod schema and parser,
    reused by both the API and the client form.
  - **web**: Added a profile view/edit page under Settings with a validated
    form and success/error feedback; routed all owner API calls through the
    shared API client (extending it with PUT support); redirected the index
    route to `/dashboard`.

- 0c4c8b1: Define the product creation contracts

  - Added the contracts for product creation inputs: `CreateProductInput`, including the owner's custom units (`CreateCustomUnitInput`).
  - Added the product response contracts: `Product`, `ProductUnit`, and their response shapes.

- 8304fb6: Add batch inventory contracts and auth session-change support

  - Added the batch contracts (`StockBatch`, `StockBatchLine`, and their create/update inputs and responses).
  - Added the inventory summary shapes (`ProductInventorySummary`, `StockStatus`) and `ProductUnitOption`.
  - Added `onAuthStateChange` to `AuthService` with an `AuthStateListener`, so the client can react to sign-in, sign-out, and token refresh.

- a1ca69b: Add dashboard reporting and filtered-list contracts

  - Added dashboard reporting types for attention, summary, trend, member
    performance, payment-method summary, and their period/query helpers.
  - Added `InventoryExpiryStatus`, nested expired/soon `ProductInventoryExpiry`
    groups with earliest expiry dates, and inventory list stock/expiry filters.
  - Added batch list status and filter contracts.
  - Extended `SaleListFilters` with multiple statuses, payment date bounds,
    unpaid, and overdue;
  - Added `taxAmount`, `amountPaid`, and `balanceDue` to sale
    summary responses.

- a1de052: Implement business creation feature

  - **api**: Added a business module with authenticated list/create endpoints
  - **@mez/types**: Added shared business request(inputs) and response types
  - **@mez/validation**: Added business creation validation schema and parser.
  - **web**: Add a business creation flow with a validated form, and a business \
    fetcher layout which will gate to the dashboard or to the business creation.

- 7373eb8: Add the product inventory detail contracts and expiry totals

  - Added the product inventory detail contracts: `ProductInventoryDetail`,
    `ProductInventoryDetailResponse`, and `ProductInventoryBatch(Line)(Response)`,
    describing a product's batches with that product's lines under each.
  - Replaced the single `earliestExpiry` with `ProductInventoryExpiry`
    (`{ lotCount, quantity }`) on the inventory list and detail, measured against
    the caller's cutoff.
  - Added `ProductInventoryListFilters` and `ProductInventoryDetailFilters` for the
    optional `expiryBefore` cutoff.

- 9b3d608: Add product edit, unit update and upload contracts

  - Added product list status and filter types.
  - Added product field and form-value types shared by create and edit forms.
  - Added `UpdateProductInput` and its result/response types.
  - Added contracts for creating a product unit, covering content and custom units.
  - Added bulk product unit update contracts for base, content and custom units.
  - Added `UpdateProductActiveInput` and its result/response types.
  - Added upload replacement contracts: `UpdateUploadInput`, `UpdateUploadResult` and `UpdateUploadResponse`.

- e06824b: Define the sales, customer and member contracts

  - Added the sale contracts: `CreateSaleInput`, `UpdateSaleInput`,
    `RecordPaymentInput`, `VoidSaleInput`, `RefundSaleInput`,
    `SaleDetailResponse`, `SaleSummaryResponse`, `SaleInvoiceResponse`,
    `SaleListFilters`, and the sale line, payment and form-value types.
  - Added the customer types: `Customer`, `CustomerResponse`, `CustomerSummary`,
    `CustomerSummaryResponse`, `CreateCustomerInput`, `CustomerFormValues`,
    `CreateCustomerResult` and `CreateCustomerResponse`.
  - Added the `MemberListFilters` member type.
  - Added the selling `price` to `ProductUnitOption`.

- 37f5a6c: Implement business profile viewing and updating

  - **api**: Added authenticated `GET` and `PUT /api/businesses/:businessId`
    endpoints, a tenant-scoped read that doubles as the ownership check before
    any write, and a validation middleware for the update payload.
  - **@mez/types**: Added the shared `UpdateBusinessInput` type, derived from the
    editable settings so the request shape cannot drift from the entity.
  - **@mez/validation**: Added the business profile update Zod schema and parser,
    reused by both the API and the client form.
  - **web**: Added a Business profile page under Settings with a read-only view
    and an edit form that stays disabled until something changes, keeps changes
    on failure, and reflects the server's persisted values on success.

- 05f4615: - **web**:
  - Implemented authentication flows, including dedicated Login and Signup pages powered by Supabase Auth.
  - Added protected route guarding to automatically restrict access based on user session status.
  - Introduced a global error boundary and a custom 404 page to gracefully catch failed or unmatched routes.
  - **packages/type**: Created a new shared package containing common TypeScript definitions and authentication types.
  - **packages/validation**: Created a new shared package for input validation schemas used across the workspace.
