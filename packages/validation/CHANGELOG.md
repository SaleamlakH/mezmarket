# @mez/validation

## 0.1.0

### Minor Changes

- 7373eb8: Validate the inventory expiry cutoff query

  - Added `productInventoryListQuerySchema` and `productInventoryDetailQuerySchema`,
    with their `validateProductInventoryListQuery` and
    `validateProductInventoryDetailQuery` parsers, for the optional `expiryBefore`
    cutoff shared by both inventory reads. A malformed instant is rejected; an
    absent or blank cutoff reads as no filter.

- 9b3d608: Add product edit, unit and upload validation

  - Added `updateProductSchema` for full product field updates.
  - Added `updateProductActiveSchema` for activation and deactivation requests.
  - Added `productListQuerySchema` and the product list status values.
  - Added `createProductUnitSchema` for adding content and custom units.
  - Added `updateProductUnitsSchema` for bulk unit edits across base, content and custom units.
  - Added `updateUploadSchema` and the update-upload client input type.
  - Added parsers for the new product, unit and upload schemas.

- 0c4c8b1: Validate product creation inputs

  - Added `createProductSchema`, the shared validation schema for product creation inputs, used by both the API and the form.

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

- e06824b: Add sales, customer and member validation

  - Added the sales Zod schemas and parsers: `createSaleSchema`,
    `updateSaleSchema`, `voidSaleSchema`, `refundSaleSchema`, the payment rules,
    and their `validateX` helpers.
  - Added `createCustomerSchema` for customer creation inputs.
  - Added `memberListQuerySchema` for the member list filter.

- a1de052: Implement business creation feature

  - **api**: Added a business module with authenticated list/create endpoints
  - **@mez/types**: Added shared business request(inputs) and response types
  - **@mez/validation**: Added business creation validation schema and parser.
  - **web**: Add a business creation flow with a validated form, and a business \
    fetcher layout which will gate to the dashboard or to the business creation.

- 8304fb6: Add batch form validation

  - Added the create/update batch Zod schemas and parsers (`createBatchSchema`, `updateBatchSchema`, `validateCreateBatch`, `validateUpdateBatch`, `validateBatchLine`, `validateUpdateBatchLine`), shared by the API and the add-batch form.

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

### Patch Changes

- Updated dependencies [41ff669]
- Updated dependencies [0c4c8b1]
- Updated dependencies [8304fb6]
- Updated dependencies [a1de052]
- Updated dependencies [7373eb8]
- Updated dependencies [9b3d608]
- Updated dependencies [e06824b]
- Updated dependencies [37f5a6c]
- Updated dependencies [05f4615]
  - @mez/types@0.1.0
