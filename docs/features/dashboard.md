# Dashboard

## Purpose

The dashboard is the business's home screen. It answers three questions in one
place: what needs attention now, how the selected period is performing, and how
the signed-in member is contributing. The reporting endpoints behind it are also
used by the sale-history and inventory deep links.

This document covers the dashboard screen and the reporting reads it consumes.
Inventory and sales have their own feature documents; the dashboard does not
expose separate inventory-summary or sales-summary endpoints.

## Concept model

- A dashboard read belongs to exactly one business and branch. Both, and the
  acting member and role, are resolved from the session and never accepted from
  the request.

- Manager tier means `OWNER` and `MANAGER`. Staff tier means `CASHIER` and
  `SERVER`. The server shapes each response by tier; the client never filters
  data by role.

- A snapshot read describes the current state and ignores the period. A period
  read uses `from` and `to`.

- `from` and `to` are ISO 8601 instants in UTC. The client turns the user's
  local day or chosen range into those instants, so the server has no notion of
  today, week, month, or a business timezone. A period must start before it ends
  and may not span more than 366 days.

- Voided sales are excluded from every dashboard figure. Refunds are not handled
  yet.

- Money values are JSON numbers rounded to two decimals at output. Counts are
  integers. Empty data returns zeros and empty arrays, never `null`; the only
  nullable number is `deltaPercent`.

- Thresholds are server constants and are not returned in responses:
  expiring within 30 days and overdue after 7 days.

## Frontend UI flow

- **Period.** The dashboard opens on Today. The other choices are 7 days, Month,
  and Custom. A custom range uses local dates and includes the whole end day.
  The chosen period drives the summary, member performance, payment methods, and
  trend, and it is kept while navigating within the business.
- **Summary.** Owner and Manager see gross profit for the period and the previous
  equal-length period, plus sales, cash collected, outstanding now, and losses.
  Cashier and Server see only sales and cash collected. The sales card opens the
  sales list for the period, the cash card opens the sales list filtered by
  payment date and paid or partially paid status, and outstanding opens unpaid
  sales. The gross-profit sparkline comes from the trend.
- **Needs attention.** A current snapshot of low or out-of-stock products,
  expired or expiring lots, and unpaid sales. Each row shows its count and opens
  the matching filtered inventory or sales list. Managers also see draft batches
  when any exist. The section shows an all-clear state when none apply.
- **Your performance.** The signed-in member's name and role, sales total and
  count, cash collected, and current unpaid-sale count for the period.
- **Payment methods.** The amount and share of payments received in the period,
  one entry per method used.
- **Interactions.** Summary, performance, payment methods, and trend share the
  period; attention is a snapshot. Summary cards and attention rows open filtered
  lists, and the gross-profit sparkline uses the trend.

## API endpoints

Every route is business-scoped. The business, branch, member, and role come from
the session plus the `:businessId` route param.

| Method | Path                                                        | Request                          | Success                         |
| ------ | ----------------------------------------------------------- | -------------------------------- | ------------------------------- |
| GET    | `/api/businesses/:businessId/dashboard/attention`           | —                                | `200 AttentionResponse`         |
| GET    | `/api/businesses/:businessId/dashboard/summary`             | `from`, `to`                     | `200 DashboardSummaryResponse`  |
| GET    | `/api/businesses/:businessId/members/:memberId/performance` | `from`, `to`                     | `200 MemberPerformanceResponse` |
| GET    | `/api/businesses/:businessId/payments/summary`              | `from`, `to`, `groupBy=method`   | `200 PaymentSummaryResponse`    |
| GET    | `/api/businesses/:businessId/dashboard/trend`               | `from`, `to`, `bucket=hour\|day` | `200 DashboardTrendResponse`    |

### Roles

| Data                                 | Manager tier | Staff tier            |
| ------------------------------------ | ------------ | --------------------- |
| Gross profit, losses, trend          | Yes          | No                    |
| Sales and cash collected (shop-wide) | Yes          | Yes                   |
| Outstanding                          | Yes          | Attention row only    |
| Needs attention counts               | All          | All; no draft batches |
| Member performance                   | Any member   | Own only              |
| Payment methods                      | Yes          | Yes                   |

## GET /api/businesses/:businessId/dashboard/attention

Returns the counts and anchors the needs-attention cards render. It does not
return entity lists; the only array is the short stock-name preview.

```ts
type AttentionResponse = {
  asOf: string;
  stock: {
    count: number;
    lowCount: number;
    outCount: number;
    preview: string[];
  };
  expiring: {
    lotCount: number;
    expiredLotCount: number;
    expiringLotCount: number;
    earliest: { productName: string; expiryDate: string } | null;
  };
  unpaid: {
    count: number;
    total: number;
    overdue: { count: number; total: number };
  };
  draftBatches?: {
    count: number;
    oldest: {
      batchId: string;
      supplierName: string | null;
      createdAt: string;
      lineCount: number;
    } | null;
  };
};
```

### Definitions

- `asOf` is the server time used for every snapshot count.
- `stock.count` is the number of active products low or out of stock.
  `lowCount` and `outCount` are exclusive and add up to `count`. A product is out
  of stock when `currentSealedStock <= 0`. It is low stock when stock is positive
  and at or below its own `lowStockThreshold`. A product with no threshold is
  never low stock. `preview` contains up to two product names, out-of-stock names
  first, then low-stock names, each ordered by name.
- `expiring` counts confirmed lots with remaining quantity and an expiry date.
  `expiredLotCount` counts `expiryDate < asOf`. `expiringLotCount` counts
  `asOf <= expiryDate < asOf + 30 days`. `lotCount` is their sum. `earliest` is
  the earliest lot across both groups, with its product name. Inactive products
  are included because their physical stock still expires.
- `unpaid.count` is the number of non-voided sales with `balanceDue > 0`.
  `unpaid.total` is the sum of those balances. `overdue` is the subset whose
  `saleDatetime` is older than seven days before `asOf`.
- `draftBatches` counts batches with `confirmedAt` null and identifies the
  earliest-created draft. The block is omitted for staff.

### Drill-down lists

| Target         | Filtered endpoint                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Low or out     | `GET /api/businesses/:businessId/inventory/products?status=active&stockStatus=low_stock,out_of_stock` |
| Expiring       | `GET /api/businesses/:businessId/inventory/products?status=all&expiryStatus=expired,soon`             |
| Unpaid         | `GET /api/businesses/:businessId/sales?unpaid=true`                                                   |
| Overdue subset | `GET /api/businesses/:businessId/sales?unpaid=true&overdue=true`                                      |
| Draft batches  | `GET /api/businesses/:businessId/inventory/batches?status=draft`                                      |

The low/out list is active-only and uses the same product-level classifier, so
its product count matches `attention.stock.count`. The expiring list returns
products, not lots; its expiry groups use the inventory list's 7-day display
window, while attention counts lots up to 30 days. Do not sum the list's expiry
groups to reproduce `attention.expiring.lotCount`.

The batch list currently ignores `status` and the draft card has no reachable
draft state, because batch creation always confirms.

## GET /api/businesses/:businessId/dashboard/summary

Params: `from`, `to`. The response is one shape; role-restricted fields are
omitted for callers without access.

```ts
type DashboardSummaryResponse = {
  period: { from: string; to: string };
  asOf: string;
  grossProfit?: {
    value: number;
    previous: number;
    deltaPercent: number | null;
  };
  sales: { total: number; count: number };
  cashCollected: { total: number; paymentCount: number };
  outstanding?: {
    total: number;
    count: number;
    overdue: { total: number; count: number };
  };
  losses?: { total: number; count: number };
};
```

### Definitions

- `period` is the requested range.
- `asOf` is the server time used for snapshot figures. It is not the period end.
- `sales.total` is the value of non-voided sales in `[from, to)`, including tax.
  `sales.count` is the number of sale rows, not lines.
- `cashCollected.total` is the sum of payments received in the period.
  `cashCollected.paymentCount` is the number of payment rows, not sales.
- `grossProfit.value` is sales total minus tax minus cost of goods sold.
  `grossProfit.previous` is the same figure for the equal-length period
  immediately before the current one. `deltaPercent` is the percentage change
  from previous to current, and is `null` when previous is zero or negative.
- `outstanding` is a snapshot of non-voided sales with a positive balance, not a
  period figure. `outstanding.overdue` is the subset older than seven days.
- `losses.total` is the cost value of loss records in `[from, to)`.
  `losses.count` is the number of loss rows.
- `grossProfit`, `outstanding`, and `losses` are manager-tier fields and are
  absent from staff responses.

### Period boundaries

The dashboard is not perfectly uniform at the upper bound:

- Sales and cost of goods sold use `[from, to)`.
- Cash collected includes a payment stamped exactly at `to`.
- Payments summary uses `[from, to)`.
- Member performance includes a sale or payment stamped exactly at `to`.

This means `summary.cashCollected.total` and `paymentSummary.total` can differ
when a payment falls exactly on the boundary, and member performance can include
one event that the dashboard summary excludes.

## GET /api/businesses/:businessId/members/:memberId/performance

Returns one member's sales, recorded cash, and current unpaid-sale count for a
period. The dashboard calls it with `memberId=me`; member management can call it
with an explicit id. The canonical contract and access rules live in
[members.md](members.md).

```ts
type MemberPerformanceResponse = {
  member: { id: string; name: string; role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'SERVER' };
  period: { from: string; to: string };
  asOf: string;
  sales: { total: number; count: number };
  cashCollected: number;
  unpaidSalesCount: number;
};
```

- Manager tier may read any member of the same business in the session branch,
  active or inactive. Staff tier may read only themselves.
- `sales` covers non-voided sales in the inclusive period where the member
  processed the sale or is the attributed server. A sale where the member is
  both counts once.
- `cashCollected` is the sum of payments the member recorded in the inclusive
  period, through non-voided sales in the branch.
- `unpaidSalesCount` is the current number of the member's period sales with a
  positive balance.
- Member rows are not a partition. A sale processed by one member and served by
  another appears in both performances, so member rows must not be summed into a
  team total.

## GET /api/businesses/:businessId/payments/summary

Params: `from`, `to`, `groupBy=method`. `groupBy` defaults to and currently
accepts only `method`. The read is shop-wide and open to every role.

```ts
type PaymentSummaryResponse = {
  period: { from: string; to: string };
  groupBy: 'method';
  total: number;
  methods: {
    method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER';
    total: number;
    paymentCount: number;
    sharePercent: number;
  }[];
};
```

Payments are grouped by method over `[from, to)`, and methods with no payments
are omitted. `paymentCount` counts payment rows, not sales. Rounded shares may
not sum to exactly 100. The headline `total` is rounded from the raw group sum,
while each method total is rounded independently, so the rounded method totals
may differ from `total` by a cent.

This endpoint uses `[from, to)`, unlike the dashboard's cash-collected figure,
which includes a payment exactly at `to`.

## GET /api/businesses/:businessId/dashboard/trend

Params: `from`, `to`, `bucket` (`hour` or `day`, optional). Manager tier only;
staff receives `403`.

```ts
type DashboardTrendResponse = {
  period: { from: string; to: string };
  bucket: 'hour' | 'day';
  points: { start: string; grossProfit: number }[];
};
```

The trend uses hourly buckets when the span is 48 hours or less and daily
buckets otherwise; an explicit hourly request above 48 hours is rejected. Points
run from `from` to `to`, with empty buckets returned as zero. Revenue is total
minus tax, and cost is pulled quantity at the frozen lot cost. The client sends
`bucket=hour` for Today and `bucket=day` for every longer period.

Trend uses the same revenue and cost definition as the summary, but points are
rounded individually, so summing the points can differ from the rounded summary
value by cents.

## Consistency rules

1. `attention.stock.count` equals `lowCount + outCount`, and every low/out
   product is counted exactly once.
2. `attention.expiring.lotCount` equals
   `expiredLotCount + expiringLotCount`.
3. `attention.unpaid.overdue.count` is never greater than `unpaid.count`, and
   `overdue.total` is never greater than `unpaid.total`.
4. The low/out drill-down returns exactly the products counted by
   `attention.stock`.
5. A staff summary omits `grossProfit`, `outstanding`, and `losses`, and their
   reads are skipped. Staff requests to the trend endpoint return `403`.
6. Member performance rows may overlap when one member processed a sale and
   another served it. Do not sum them into a team total.
7. A payment method's `paymentCount` counts payment rows, not sales. Rounded
   `sharePercent` values may not sum to exactly 100.
8. The expiring drill-down is not a lot-level reproduction of attention: the
   list returns products and its expiry groups use a 7-day display window.

## Limitations

- The inventory batch list ignores `status`; the draft-batches card has no
  reachable draft state because batch creation always confirms.
- Inventory and dashboard stock classification use only each product's
  `lowStockThreshold`. The business's `lowStockDefaultThreshold` is stored but
  is not applied as a fallback.
- Sales, trend, and payments use `[from, to)`, while cash collected and member
  performance include exactly `to`.
- The expiring drill-down returns products whose lots fall within 30 days, but
  the returned expiry groups always use a 7-day display cutoff.
- The Losses card links to `#`.
- Dashboard queries use the app-wide five-minute stale time and React Query's
  focus refetch. No explicit dashboard invalidation is wired to sale or
  inventory mutations.
- The summary section requests the trend alongside the summary even for staff;
  the staff trend request is rejected and the gross-profit block is not
  rendered.
- Dashboard and feature lists are unpaginated.

## Error concepts

- Unauthenticated request: the identity cannot be established.
- Not your business: the business is not one the caller belongs to, or it has no
  branch to scope to.
- Invalid period: `from` is not before `to`, or the span exceeds 366 days.
- Invalid trend bucket: an unknown bucket, or an hourly request longer than 48
  hours.
- Forbidden: a staff request to the trend endpoint, or a staff request for
  another member's performance.

Every failure is delivered as a structured error envelope by the global error
handler; see [error-handling.md](error-handling.md).

## Design rationale / invariants

- **Scope is derived, never trusted.** Business, branch, member, and role come
  from the resolved session.
- **Voided sales are excluded everywhere.** Every reporting read applies the same
  non-voided predicate.
- **Snapshot and period are separate.** Attention and outstanding describe now;
  the other figures use the selected period.
- **Role shaping is server-side.** The client renders the fields it receives and
  never decides what a role may see.
- **No feature-service reuse.** Dashboard reads do not call the inventory or
  sales services; shared pure helpers cover classification and money.
- **Money is rounded at the edge.** Calculations keep stored decimal precision
  and round only when serializing.

## Cross-references

- [sales.md](sales.md) — the filtered sale list and its payment fields.
- [inventory.md](inventory.md) — the filtered product list and expiry groups.
- [members.md](members.md) — the canonical member-performance contract.
- [business.md](business.md) — business settings and branch scope.
- [error-handling.md](error-handling.md) — the structured error envelope.
- [../schema.md](../schema.md) — the `Sale`, `Payment`, `Loss`, and
  `StockBatchLine` entities.
