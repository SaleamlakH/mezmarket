# Sales

## Purpose

Recording what the business sells. A sale is built from one or more lines (product, unit sold-in, quantity), carries who processed it, optionally who took the order and who owes it, and ends up Paid, Pending or Partially Paid with a shareable invoice. Stock is drawn per line when the sale is confirmed, and every significant action lands in the audit log.

## Concept model

- A sale belongs to exactly one business and branch. Both, and the acting member, are derived server-side from the resolved session — never accepted from the request body.

- A sale is a header plus its parts: a per-branch invoice number, a sale datetime, the money fields, one or more lines, zero or more payments, and the member who processed it. It may also name the customer it is for and the server who took it; both are optional and independent of payment.

- A line snapshots everything about what was sold — the product name, the unit sold in, the standard unit it resolves to, the quantity, and the unit price — so a later rename or price change never rewrites a past sale.

- Payment is a separate record: a sale is `PENDING`, `PARTIALLY_PAID` or `PAID`, always derived from the payments actually recorded against it. `voidStatus` is `NONE` or `VOIDED`; a void is a full reversal, while a refund is recorded per line.

- Confirming a sale draws stock per line from the oldest purchase lot that can cover the whole line (FIFO), so a small fractional remnant is not consumed in pieces. A lot smaller than the line is skipped even when it holds a fractional remnant, as long as a later lot can cover the line; only when no single lot can cover the line does the draw split across the oldest lots, freezing each lot's cost at that moment. Lines for the same product draw in order from the same remaining lot quantities, so a lot skipped by one line remains available to a later line it can cover.

- Totals are derived: the line subtotal, minus an optional whole-sale discount, plus the business's tax rate (snapshotted onto the sale), rounded to two places.

## Frontend UI flow

- `/sales` shows the catalog as a grid; each card carries the name, brand, stock and current price.
- Adding is deliberate: the card opens a unit-and-quantity editor (popover on desktop, dialog on mobile); a line counts only once its quantity is above zero.
- The cart is a shared in-memory draft mounted above all business routes, so it survives navigation; it clears only on Clear, a completed sale, or a reload.
- The cart panel edits per product and per line (change unit, adjust quantity, remove), with a running totals preview from the business tax config.
- Checkout attaches an optional customer (picker with inline create) and an optional server (role `SERVER`).
- The payment control offers status chips `PAID` / `PENDING` / `PARTIALLY_PAID`, an amount for partial, and a method with optional detail.
- Confirming swaps the panel to a success state showing the invoice number, total and payment status.
- `/sales` lists recent sales as a rail with See more; `/sales/all` shows the full list. Both are one server-ordered list, pending first, then partially paid, then paid, newest first within a status.
- `/sales/all` offers status chips: All, Outstanding, Overdue (7+ days), Paid & partial, `PAID`, `PENDING`, and `PARTIALLY_PAID`. Outstanding sets `unpaid=true`; Overdue sets `overdue=true`, which implies unpaid; Paid & partial sets `status=paid,partially_paid`. Dashboard deep links prefill the sale or payment date range and the matching status or unpaid filter.
- `/sales/:id` shows the summary, purchase lines, totals and customer, and offers one action: record a payment, hidden once the sale is settled or voided.

## API Endpoints

Every route is business-scoped: the business and its default branch come from the session plus the `:businessId` route param, and the acting member from the resolved identity. None of them is ever accepted from the request body.

The request and response shapes below are the shared contract in `@mez/types` (`packages/types/src/sales/sales.types.ts`), so the API and the web client agree on them by construction. Form-value types (`SaleFormValues`, `PaymentFormValues`, `VoidSaleFormValues`, `RefundSaleFormValues`) are the client-side text shapes the shared validation in `@mez/validation` coerces into these inputs.

| Method | Path                                                 | Request                   | Success                     |
| ------ | ---------------------------------------------------- | ------------------------- | --------------------------- |
| POST   | `/api/businesses/:businessId/sales`                  | `CreateSaleInput`         | `201 CreateSaleResponse`    |
| GET    | `/api/businesses/:businessId/sales`                  | `SaleListFilters` (query) | `200 SaleSummaryResponse[]` |
| GET    | `/api/businesses/:businessId/sales/:saleId`          | —                         | `200 SaleDetailResponse`    |
| PUT    | `/api/businesses/:businessId/sales/:saleId`          | `UpdateSaleInput`         | `200 UpdateSaleResponse`    |
| POST   | `/api/businesses/:businessId/sales/:saleId/payments` | `RecordPaymentInput`      | `201 SaleDetailResponse`    |
| POST   | `/api/businesses/:businessId/sales/:saleId/void`     | `VoidSaleInput`           | `200 VoidSaleResponse`      |
| POST   | `/api/businesses/:businessId/sales/:saleId/refund`   | `RefundSaleInput`         | `200 RefundSaleResponse`    |
| GET    | `/api/businesses/:businessId/sales/:saleId/invoice`  | —                         | `200 SaleInvoiceResponse`   |

Update, void, refund and invoice are the target contract: their validation and types exist, but the API does not expose them yet. The list filters are implemented.

`CreateSaleResponse`, `UpdateSaleResponse`, `VoidSaleResponse` and `RefundSaleResponse` are aliases of `SaleDetailResponse`, so a sale reads back identically no matter which write produced it.

### Roles

| Action                | Owner | Manager | Cashier |
| --------------------- | :---: | :-----: | :-----: |
| Create, edit a sale   |  yes  |   yes   |   yes   |
| Record a payment      |  yes  |   yes   |   yes   |
| Browse, read, invoice |  yes  |   yes   |   yes   |
| Void / refund         |  yes  |   yes   |   no    |

### POST /api/businesses/:businessId/sales

Creates and confirms a sale in one action — there is no draft. Stock is drawn, the invoice exists, and the opening payment status is set as part of the same write.

```
Client -> Authorization: Bearer <jwt> + CreateSaleInput body
   -> auth middleware resolves the owner
   -> business middleware resolves the business and default branch
   -> role middleware requires Owner, Manager or Cashier
   -> validation middleware applies the shared create-sale rules
   -> service loads each named product's sell-capable units, then checks
      every line before writing:
          - rejects a product the business does not have
          - collects every unit that is not that product's, cannot be sold,
            or carries no price, keyed by lines.<index>.productUnitId
          - collects every product whose draw would take sealed stock below
            zero (when disallowed), keyed by lines.<index>.productId
          - answers all collected errors together instead of the first one
      then per line:
          - snapshots the sold unit, the standard unit it resolves to,
            the quantity in that unit, and the unit price
          - allocates the line against stock FIFO, from the oldest lot that
            can cover the whole line, splitting only when no single lot can
   -> repository runs one transaction:
           1. generate the branch-unique invoice number
           2. insert the sale, confirmed, against the acting member,
              with subtotal, tax and total computed from the lines, the
              optional whole-sale discount and the business tax rate
           3. insert one sale line per product line
           4. insert each line's FIFO allocation rows (SaleLineCost),
              snapshotting each lot's cost at that moment
           5. decrement each drawn lot's remaining quantity and the
              product's sealed stock
           6. insert the initial payment, when one was given
           7. set paymentStatus / amountPaid / balanceDue from the
              payments recorded
           8. write one audit-log row for the confirmation
   -> 201 CreateSaleResponse
```

The optional body fields:

| Field            | Behavior                                                                                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialPayment` | opens the sale at the status it names: `PAID` with no amount settles the whole total, `PARTIALLY_PAID` records the amount it names, `PENDING` records nothing. Blank is dropped by validation; with none the sale is `PENDING` and owes its whole total. |
| `discount`       | a whole-sale reduction, never per-line; subtracted from the line subtotal before tax is applied, and refused when larger than it. Blank stores no discount.                                                                                              |
| `customerId`     | attributes the sale to an active customer of the business, without affecting totals or payment status.                                                                                                                                                   |
| `serverMemberId` | attributes the sale to the active member with role `SERVER` who took the order; reads back as `servedBy`, separate from `processedBy`.                                                                                                                   |

When a draw would take sealed stock below zero the sale is still recorded unless the business disallows negative stock, in which case the whole request is refused. The refusal carries short messages under the same dotted field paths as validation: `lines.<index>.productId` for stock and `lines.<index>.productUnitId` for unit problems. The client shows each message on the matching cart item or line.

### GET /api/businesses/:businessId/sales

Lists the business's sales, status-first, filtered by the query. Sales still needing attention lead: pending, then partially paid, then paid; within each status they run newest first.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> repository returns the scope's sales, status-first,
      newest first within each status, narrowed to the summary
      fields, filtered by:
         - status: comma-separated paymentStatus values, case-insensitive,
           deduplicated
         - from / to: saleDatetime range, inclusive
         - paymentFrom / paymentTo: paidAt range on any payment, inclusive
         - productId: sales that have a line for that product
         - unpaid: non-voided sales with balanceDue > 0 and
           paymentStatus != PAID
         - overdue: implies unpaid, ignores from, and uses an upper bound of
           min(now - 7 days - 1 ms, to)
   -> 200 [ SaleSummaryResponse, ... ]
```

The list always excludes `VOIDED` sales, whether or not `status` is given. An empty history is a `200` with an empty list, not a `404`. `SaleListFilters.from` and `.to` are ISO 8601 instants, the form they take in the query string. The server sorts by `paymentStatus` ascending, then `saleDatetime` descending, so pending leads, then partially paid, then paid, newest first within each status.

`unpaid=true` and `overdue=true` are the dashboard's attention filters. `overdue=true` implies unpaid and uses the server's seven-day cutoff; it also drops any `from` bound, because the cutoff supplies the lower bound. The list summary carries `taxAmount`, `amountPaid`, and `balanceDue` alongside the existing header fields, so the unpaid row does not need a detail read.

### GET /api/businesses/:businessId/sales/:saleId

Reads one sale with its lines, payments and the member who processed it.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> repository loads the sale by id, scoped to the business, with its
      lines (joined to product name and brand), its payments, and its
      processing member
   -> 200 SaleDetailResponse
```

### PUT /api/businesses/:businessId/sales/:saleId

_Planned — not yet exposed by the API._

Edits a sale. Lines are restated wholesale, the way a batch is edited: a line with an `id` updates in place, one without is inserted, and an existing line left out of the payload is removed. Totals, amount paid, balance due and status are recomputed after every edit.

```
Client -> Authorization: Bearer <jwt> + UpdateSaleInput body
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> role middleware requires Owner, Manager or Cashier
   -> validation middleware applies the shared edit-sale rules
   -> service loads the sale scoped to the business, then diffs the
      submitted lines against the stored ones by id:
         - an unchanged line keeps its unit snapshots and stock draw
         - an inserted or increased line draws stock again, FIFO,
           under the negative-stock rule
         - a removed or reduced line gives its stock back to the lots
           it drew from
   -> repository runs one transaction:
          1. apply the line inserts, updates and removals
          2. restore stock for removed / reduced lines
          3. draw stock for inserted / increased lines
          4. recompute subtotal, tax and total
          5. recompute paymentStatus / amountPaid / balanceDue
          6. write one audit-log row for the edit
   -> 200 UpdateSaleResponse
```

### POST /api/businesses/:businessId/sales/:saleId/payments

Records a payment against a sale and recomputes what is owed. The sale being paid is the `:saleId` in the path — it is not part of `RecordPaymentInput`.

`RecordPaymentInput` carries the `status` the seller chose plus an optional `amount`, `method` and `methodDetail`:

| Status           | Amount                          | Recorded payment                        |
| ---------------- | ------------------------------- | --------------------------------------- |
| `PAID`           | optional — omit to settle whole | the balance due, or the amount if named |
| `PARTIALLY_PAID` | required                        | the amount named                        |
| `PENDING`        | not allowed                     | none — only when nothing has been paid  |

A `PAID` sale whose amount falls short of the balance is still recorded as `PAID`, and `balanceDue` reports what is left; the client warns rather than the API blocking. An overpayment is kept on `amountPaid` while `balanceDue` floors at zero. Status only moves forward: a sale that is `PAID` cannot be paid again, and a sale that already holds a payment cannot be walked back to `PENDING`.

```
Client -> Authorization: Bearer <jwt> + RecordPaymentInput body
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> role middleware requires Owner, Manager or Cashier
   -> validation middleware applies the shared payment rules: a status
      is required, a partial payment needs an amount, and a pending
      stamp carries none
   -> service loads the sale scoped to the business and rejects a sale
      that is voided, already PAID, or marked PENDING while it already
      holds a payment
   -> service resolves the amount to record: the named amount, or the
      balance due for a PAID payment with no amount
   -> repository runs one transaction:
          1. insert the payment, against the acting member, defaulting
             the method to OTHER when none was given
          2. sum the sale's payments and restamp amountPaid, balanceDue
             and the asserted paymentStatus from that sum
          3. write one audit-log row
   -> 201 SaleDetailResponse
```

The full sale is returned rather than the bare payment, because recording one payment is what moves the sale's balance and status; the created payment is the newest entry in `payments`.

### POST /api/businesses/:businessId/sales/:saleId/void

_Planned — not yet exposed by the API._

Voids a sale — a full reversal of something that shouldn't have happened.

```
Client -> Authorization: Bearer <jwt> + VoidSaleInput body
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> role middleware requires Owner or Manager
   -> validation middleware requires a reason
   -> service loads the sale scoped to the business and rejects one
      already voided
   -> repository runs one transaction:
          1. set voidStatus = VOIDED and store voidReason
          2. restore stock for every line, following its product's
             default restock behavior, to the lots it drew from
          3. write one audit-log row
   -> 200 VoidSaleResponse
```

### POST /api/businesses/:businessId/sales/:saleId/refund

_Planned — not yet exposed by the API._

Refunds a sale — it happened, the goods came back. Each line restocks according to its product's default unless the request overrides it for that sale.

```
Client -> Authorization: Bearer <jwt> + RefundSaleInput body
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> role middleware requires Owner or Manager
   -> validation middleware requires a reason and checks that every
      overridden line id names a line on the sale
   -> service resolves each line's restock choice: the override when
      one is given, otherwise the product's default
   -> repository runs one transaction:
          1. mark each line refunded, and refundRestocked by its
             resolved choice
          2. restore stock for every restocked line, to the lots it
             drew from
          3. write one audit-log row
   -> 200 RefundSaleResponse
```

### GET /api/businesses/:businessId/sales/:saleId/invoice

_Planned — not yet exposed by the API._

Builds the shareable invoice, from what is on the sale plus the business's display settings, never from current product data.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> repository loads the sale with its lines and payments
   -> service attaches the business name, currency and tax-display
      mode, and the branch name and address
   -> 200 SaleInvoiceResponse
```

## Limitations

- **Update, void, refund and the invoice are documented but not implemented.** The API exposes list, get, create and record-payment only; their validation rules exist but no service, repository or route uses them.
- **No audit-log writes.** The sale actions and entity type exist in the schema, but no sale write records one.
- **The list is unpaginated.** The status, date-range, payment-range, product, unpaid, and overdue filters are applied, but the endpoint returns every matching row.
- **Stock is business-scoped while sales are branch-scoped.** A sale is scoped to one branch but draws from the business's lots, so stock can move across branches.
- **The payment status is caller-asserted.** A sale can read `PAID` and still carry a balance, and an overpayment is kept while the balance floors at zero.
- **A fractional lot smaller than the line is skipped.** When an older lot cannot cover the whole line but a newer lot can, the whole line is drawn from the newer lot and the older fractional remnant stays untouched. This deliberately preserves small remnants for smaller sales, but means a fractional line is not drained from the oldest lot first and the draw is not strict FIFO by lot age.

## Error concepts

- Unauthenticated request: the identity cannot be established.
- Not your business: the business is not one the caller belongs to, or it has no branch to scope to.
- Forbidden: the acting member's role is not allowed for the action — cashier on void/refund.
- Invalid payload: fails the shared validation rules, reported with per-field detail.
- Product not found: a line names a product the business does not have.
- Unit not on product: the chosen unit is not one of that product's units, reported under that line's `productUnitId` path.
- Unit not sellable: the chosen unit cannot be sold or carries no price, reported under that line's `productUnitId` path.
- Negative stock blocked: the draw would take sealed stock below zero and the business disallows it, reported under that product's first line `productId` path. All bad lines and products are reported together.
- Not found: the sale does not exist within the resolved scope.
- Already voided: a void or payment names a sale that is already voided.

Every failure is delivered as a structured error envelope by the global error handler; see [error-handling.md](error-handling.md).

## Design rationale / invariants

- **Scope is derived, never trusted.** Business, branch and the acting member come from the resolved session; a named customer or server is re-checked against the business before it is stored.
- **A sale is one unit of work.** The header, lines, payments, cost allocations and stock decrements are written in a single transaction, so a sale is never half-recorded.
- **Nothing about a line is read live.** The product name, units, quantity and price are snapshotted at sale time, so later catalog changes never rewrite history.
- **Payments are re-summed, not trusted.** A recorded payment appends a row, and the sale's amount paid, balance and status are recomputed from all its rows.
- **Stock is drawn from the oldest lot that can cover the line.** A fractional remnant smaller than the line is left for a smaller sale and is not drained into a larger line; only when no single lot can cover the line does the draw split across the oldest lots, freezing each lot's cost at the draw.

## Cross-references

- [auth.md](auth.md) — how the acting owner is resolved.
- [business.md](business.md) — where the business, its branch and tax settings come from.
- [customers.md](customers.md) — the customer a sale may be attributed to.
- [members.md](members.md) — the server attribution and member roles.
- [products.md](products.md) — the products and units a sale line is built from.
- [inventory.md](inventory.md) — where the stock a sale draws comes from.
- [dashboard.md](dashboard.md) — the payment summary by method and other reporting reads.
- [error-handling.md](error-handling.md) — the structured error envelope.
- [../schema.md](../schema.md) — the `Sale`, `SaleLine`, `SaleLineCost` and `Payment` entities.
- [../unit-system-architecture.md](../unit-system-architecture.md) — how a sale line's snapshotted standard-unit figure is computed.
