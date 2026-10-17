# Sales

## Purpose

Recording what the business sells. A sale is built from one or more lines (product, unit sold-in, quantity), carries who processed it, optionally who took the order and who owes it, and ends up Paid, Pending or Partially Paid with a shareable invoice. Stock is drawn per line when the sale is confirmed, and every significant action lands in the audit log.

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

`CreateSaleResponse`, `UpdateSaleResponse`, `VoidSaleResponse` and `RefundSaleResponse` are aliases of `SaleDetailResponse`, so a sale reads back identically no matter which write produced it.

### Roles

| Action                | Owner | Manager | Cashier |
| --------------------- | :---: | :-----: | :-----: |
| Create, edit a sale   |  yes  |   yes   |   yes   |
| Record a payment      |  yes  |   yes   |   yes   |
| Browse, read, invoice |  yes  |   yes   |   yes   |
| Void / refund         |  yes  |   yes   |   no    |

### POST /api/businesses/:businessId/sales

Creates and confirms a sale in one action — there is no draft. Stock is drawn, the invoice exists, and the opening payment status is set as part of the same write: `PENDING` when no initial payment is given, otherwise the status the initial payment names.

```
Client -> Authorization: Bearer <jwt> + CreateSaleInput body
   -> auth middleware resolves the owner
   -> business middleware resolves the business and default branch
   -> role middleware requires Owner, Manager or Cashier
   -> validation middleware applies the shared create-sale rules
   -> service loads each named product's sell-capable units, then per line:
         - rejects a product the business does not have
         - rejects a unit that is not that product's
         - rejects a unit the product cannot be sold in
         - rejects a sell-capable unit that carries no price
         - snapshots the sold unit, the standard unit it resolves to,
           the quantity in that unit, and the unit price
         - allocates the line against stock FIFO, oldest purchase lot
           first, splitting the line across lots when the oldest runs out
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

A sale with no initial payment is `PENDING` and owes its whole total. An `initialPayment` opens the sale at the status it names: `PAID` with no amount settles the whole total, `PARTIALLY_PAID` records the amount it names and keeps a balance, and `PENDING` records nothing. The initial payment block is optional and a blank one is dropped by the shared validation, so the untouched payment section of the new-sale form never trips a required error.

`discount` is an optional whole-sale reduction, never a per-line one. It is stored on the sale as entered, subtracted from the line subtotal before the tax rate is applied, so the total is the discounted amount plus tax. A blank field is no discount and leaves the stored value empty. A discount larger than the line subtotal is refused with a `discount` field error rather than swallowed, since it would mean taking off more than the goods are worth.

`customerId` is an optional attribution, independent of the payment: a sale may name an existing customer of the business, with or without a payment, and the link never affects the totals or the payment status. The API rejects an id that is not an active customer of the acting business, so a sale can never be attributed across businesses. A sale with no customer omits the field and stores none; see [customers.md](customers.md).

`serverMemberId` is an optional whole-sale attribution, separate from who processed the sale: it names the member with role `SERVER` who took the order. The API rejects an id that is not an active server of the acting business, so attribution can never cross businesses or point at a member who does not take orders. The acting member recorded as `processedBy` is unchanged; the tagged server reads back as `servedBy` on the sale. A sale with no server omits the field and stores none. The candidates for the picker come from `GET /api/businesses/:businessId/members?role=SERVER`.

When a draw would take sealed stock below zero, the recording still proceeds and the response carries the resulting stock unless the business has `allowNegativeStock` turned off, in which case the whole request is rejected. The warning itself is surfaced by the client, which already holds each product's current stock.

### GET /api/businesses/:businessId/sales

Lists the business's sales, status-first, filtered by the query. Sales still needing attention lead: pending, then partially paid, then paid; within each status they run newest first.

```
Client -> Authorization: Bearer <jwt>
   -> auth middleware resolves the owner
   -> business middleware resolves the scope
   -> repository returns the scope's sales, status-first,
      newest first within each status, narrowed to the summary
      fields, filtered by:
         - status: paymentStatus
         - from / to: saleDatetime range, inclusive
         - productId: sales that have a line for that product
   -> 200 [ SaleSummaryResponse, ... ]
```

An empty history is a `200` with an empty list, not a `404`. `SaleListFilters.from` and `.to` are ISO 8601 instants, the form they take in the query string.

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

### Error concepts

- Unauthenticated request: the identity cannot be established.
- Not your business: the business is not one the caller belongs to, or it has no branch to scope to.
- Forbidden: the acting member's role is not allowed for the action — cashier on void/refund.
- Invalid payload: fails the shared validation rules, reported with per-field detail.
- Product not found: a line names a product the business does not have.
- Unit not on product: the chosen unit is not one of that product's units.
- Unit not sellable: the chosen unit cannot be sold, or carries no price.
- Negative stock blocked: the draw would take sealed stock below zero and the business disallows it.
- Not found: the sale does not exist within the resolved scope.
- Already voided: a void or payment names a sale that is already voided.

Every failure is delivered as a structured error envelope by the global error handler; see [error-handling.md](error-handling.md).

## Cross-references

- [../unit-system-architecture.md](../unit-system-architecture.md) — how a sale
  line's snapshotted standard-unit figure is computed, and why the schema cannot
  detect a wrong unit or quantity entered at sale time.
