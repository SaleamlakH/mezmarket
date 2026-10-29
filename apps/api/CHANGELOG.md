# api

## 0.4.0

### Minor Changes

- b572e1e: Use the authenticated user's name when provisioning owners and members

  - JWT verification now reads `user_metadata.full_name` and passes it through
    auth resolution.
  - New owners are created with the provided name, falling back to `"New User"`
    when it is absent.
  - The OWNER business member now uses the owner's name instead of the literal
    `"me"`.

### Patch Changes

- be493b3: Fix sale lot draws and report blocked sale lines

  - Draw each sale line from the oldest lot that can cover the whole line, so a
    fractional remnant is left for a smaller sale instead of being consumed in
    pieces. Split across lots only when no single lot can cover the line.
  - Report all blocked stock draws and unusable units in one response, keyed by
    the line's `productId` or `productUnitId` field path, naming the unit where
    the server can resolve it.

- Updated dependencies [b572e1e]
  - @mez/validation@0.3.0

## 0.3.0

### Minor Changes

- 34003f5: Treat tax rates as percentages and only add tax when tax on sales is enabled

  - Tax rates are now percentages everywhere: `15` means 15%
  - Added `taxOnSales` and removed `TaxDisplayMode` from the shared business
    contracts. Sales are taxed only when the business enables tax on sales.
  - Enabling tax on sales requires a rate between 1 and 50.
  - `taxRateApplied` snapshots the percentage rate, or `0` when tax is off.
  - Updated the API totals, web previews and invoice labels to use percentage
    rates consistently.
  - Added a migration for the new column and rate precision

### Patch Changes

- Updated dependencies [34003f5]
  - @mez/validation@0.2.0

## 0.2.0

### Minor Changes

- 2569a54: Read a batch, a product inventory detail, and total expiry against a cutoff

  - Added `GET /api/businesses/:businessId/inventory/batches/:batchId`, returning a
    batch's details and product lines scoped to the caller's business and branch.
  - Added `GET /api/businesses/:businessId/inventory/products/:productId`, returning
    a product's stock summary plus every batch it appeared in, newest batch first,
    with that product's lines under each batch.
  - Both inventory reads — `GET .../inventory/products` and
    `GET .../inventory/products/:productId` — accept an optional
    `expiryBefore=<ISO instant>` cutoff and return `expiry`, the number of lots
    expiring by then and the stock they hold in base units. Without it the API uses
    the moment of the request, so already-expired lots still count.
  - Both reads are open to every member; an unknown or out-of-scope id answers
    `404`. The product detail also reads inactive products, so a deactivated
    product's history stays available.

  ### Fixes
  - Mounted the business routes once; they were registered twice.

- 8304fb6: Add inventory and batch intake endpoints

  - Added authenticated endpoints
    - `GET/POST /api/businesses/:businessId/inventory/batches`
    - `GET /api/businesses/:businessId/inventory/products` (per-product stock summary);
  - Split a product's units into `GET /api/businesses/:businessId/products/:productId/units`.

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

- a1ca69b: Add dashboard reporting and reporting filters

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

- 5f7872b: - Added Jwt verification against the remote JWKS(supabase) and maps the provider user id to an owner identity, creating one on first login.
- 0c4c8b1: Implement product creation and fetching

  - `POST /businesses/:businessId/products` creates a product with its units in a single transaction.
  - `GET /businesses/:businessId/products` and `GET /businesses/:businessId/products/:productId` fetch the catalog and a single product.
  - `GET /units` provides the standard units reference data.

- a1de052: Implement business creation feature

  - **api**: Added a business module with authenticated list/create endpoints
  - **@mez/types**: Added shared business request(inputs) and response types
  - **@mez/validation**: Added business creation validation schema and parser.
  - **web**: Add a business creation flow with a validated form, and a business \
    fetcher layout which will gate to the dashboard or to the business creation.

- e06824b: Implement the sales, customer and member endpoints

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

- 9b3d608: Add product editing, availability and unit management

  - Added `PUT /api/businesses/:businessId/products/:productId` to replace a product's own fields.
  - Added `PATCH /api/businesses/:businessId/products/:productId/active` to activate or deactivate a product.
  - Added `POST /api/businesses/:businessId/products/:productId/units` to add a content unit or one of the owner's custom units.
  - Added `PUT /api/businesses/:businessId/products/:productId/units` for bulk unit edits, covering base and content unit prices plus custom unit names, prices and capabilities.
  - Added product list status filtering through `status=active|inactive|all`, defaulting to active.
  - Added `PUT /api/businesses/:businessId/products/:productId/uploads` to set or replace a product photo, reusing the existing upload and object.

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

### Patch Changes

- Updated dependencies [7373eb8]
- Updated dependencies [9b3d608]
- Updated dependencies [0c4c8b1]
- Updated dependencies [41ff669]
- Updated dependencies [a1ca69b]
- Updated dependencies [e06824b]
- Updated dependencies [a1de052]
- Updated dependencies [8304fb6]
- Updated dependencies [37f5a6c]
- Updated dependencies [05f4615]
  - @mez/validation@0.1.0

## 0.1.0

### Minor Changes

- d876fec: Initial api setup
