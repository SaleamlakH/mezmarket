# web

## 0.2.0

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

- 9b3d608: Add the product detail and editing flow

  - Added a product detail page showing the product's photo, fields, units
  - Added editing for the product's name, brand, description, low stock threshold and track-as-partial setting.
  - Added photo replacement on the detail page.
  - Added base and content unit price editing.
  - Added support for adding content units and the owner's custom units.
  - Added editing for custom unit names, prices and purchase/sell capabilities.
  - Added product activation and deactivation with confirmation.

- a1de052: Implement business creation feature

  - **api**: Added a business module with authenticated list/create endpoints
  - **@mez/types**: Added shared business request(inputs) and response types
  - **@mez/validation**: Added business creation validation schema and parser.
  - **web**: Add a business creation flow with a validated form, and a business \
    fetcher layout which will gate to the dashboard or to the business creation.

- 0c4c8b1: Add the products page and creation form

  - Built the products page.
  - Built the product creation form, including the owner's custom units.

- 8304fb6: Add inventory management and fix post-auth redirect

  - Added the inventory overview (recent-batches rail and product stock list), the add-batch dialog (batch details, product picker, and batch lines with a running total), and the all-batches page.
  - Product photos render on every inventory surface.

  ### Fixes
  - Fixed login and signup not redirecting home after a successful sign-in.

- 7373eb8: Add the batch and product inventory detail pages

  - Added the product inventory detail page: stock by purchase unit, an expiry
    warning, and the purchase history grouped by batch, each batch linking to its
    record.
  - Added the batch detail page.
  - The product list shows the lots and quantity expiring by the API's cutoff
    (a seven-day window).
  - Kept a navigation trail so Back returns to the page the user came from across
    multi-hop routes, instead of a single hard-coded hop.

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
- e06824b: Implement the sales web flow

  - Added the point-of-sale flow: a product grid with a deliberate
    unit-and-quantity editor, a shared sale draft store, and a review panel with
    running totals, customer/server attribution, payment entry and a success
    state.
  - Added the recent-sales rail, the all-sales page, and the sale detail page
    with inline payment recording.

### Patch Changes

- Updated dependencies [7373eb8]
- Updated dependencies [9b3d608]
- Updated dependencies [0c4c8b1]
- Updated dependencies [41ff669]
- Updated dependencies [e06824b]
- Updated dependencies [a1de052]
- Updated dependencies [8304fb6]
- Updated dependencies [37f5a6c]
- Updated dependencies [05f4615]
  - @mez/validation@0.1.0

## 0.1.0

### Minor Changes

- e8a429d: Initial web application setup
