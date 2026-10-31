# web

## 0.4.3

### Patch Changes

- 10aad8c: Remove GitHub and open-source content from the home page

## 0.4.2

### Patch Changes

- 0384825: fix: update brand link to '/home' in mobile layout

## 0.4.1

### Patch Changes

- 7462513: Redirect authenticated users to the dashboard

  - Successful login, signup, and email verification now land on
    the dashboard instead of the home page. They able to access the
    the home page by explicit `/home` path
  - Authenticated users visiting `/` are now sent to the dashboard.

## 0.4.0

### Minor Changes

- b572e1e: Add account onboarding and security improvements

  - Sign up with a full name.
  - Verify email with a 6-digit code, with resend support.
  - Reset a forgotten password using an emailed code
  - Change password from Profile; successful changes sign out all devices.
  - Log out from Settings or the sidebar.
  - Unverified accounts are guided to email verification before continuing.
  - Improve navigation and confirmation messages across sign-in, sign-up, email
    verification, and password screens.

- 7d88c9d: Add a public home page

### Patch Changes

- be493b3: Show sale errors on the matching cart item or line
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

- a1ca69b: Add dashboard reporting UI and list filters

  - Added the dashboard page with period selection and sections for summary, needs
    attention, member performance, and payment methods.
  - Added role-shaped summary cards, gross-profit comparison and sparkline,
    attention drill-downs, payment-method shares, and links into filtered
    inventory and sale lists.
  - Added stock and expiry filter chips to the inventory summary, covering all,
    low-and-out, expiring, and expired states, with the expired/soon breakdown.
  - Added sale-history chips for outstanding, overdue, paid-and-partial, and
    individual payment statuses, with sale and payment date filters forwarded from
    the dashboard.
  - Persisted the selected period and filters across navigation.

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
- Updated dependencies [a1ca69b]
- Updated dependencies [e06824b]
- Updated dependencies [a1de052]
- Updated dependencies [8304fb6]
- Updated dependencies [37f5a6c]
- Updated dependencies [05f4615]
  - @mez/validation@0.1.0

## 0.1.0

### Minor Changes

- e8a429d: Initial web application setup
