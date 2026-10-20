# Dashboard and feature summaries: API specification

## 1. Purpose and scope

This spec defines the backend endpoints behind the dashboard and the small summary strips on the inventory and sales pages. The guiding rule is that every number has one definition, and that definition is used everywhere the number appears.

In scope: the two feature summaries (inventory, sales), the needs-attention endpoint and the filtered lists its cards open, and the period-based endpoints (dashboard summary, member performance, payment methods, trend).

Deferred: team performance, refund and void handling (rules below are placeholders), the open-container sale flow (the container summary only reads existing rows), timezone support, and extra cards such as top debtors or slow movers.

## 2. Conventions

- Auth context: businessId, branchId, member id and role always come from the authenticated session. No endpoint accepts them as parameters.
- Role tiers: manager tier means OWNER and MANAGER. Staff tier means CASHIER and SERVER. The server shapes each response by tier. The client never filters data by role.
- Repository/service boundary: repositories use Prisma `aggregate`/`groupBy` for metrics and return the minimum supporting rows for calculations; services finish the business math. No raw SQL and no computed columns or migrations.
- Module boundary: a feature never imports or injects another feature's service. Routes and middleware may be passed at the composition root; that is wiring, not service reuse. Cross-feature business rules must be pure functions in `apps/api/src/shared/utils` and imported directly.
- Async: start independent repository calls immediately and attach their calculations. `Promise.all` is a join at a dependency boundary, not a barrier that waits for every query before any calculation starts. Do not wrap the whole request in one interactive transaction.
- Period parameters: `from` and `to` are ISO 8601 instants in UTC, forming a half-open range \[from, to). The client computes them from the user's local day or chosen range. The server has no notion of today, week, or month and never uses a business timezone. Validation: from must be before to, and the span may not exceed 366 days, otherwise respond 400.
- Previous period: the same length immediately before the range, \[from − (to − from), from).
- Money: JSON numbers. The client formats them using the business currency. Counts are integers. Compute with decimals and round half up at output only.
- Snapshot versus period: snapshot figures describe now (`asOf`) and ignore from and to. Period figures use from and to.
- Excluded sales (placeholder): sales with voidStatus VOIDED are excluded from every figure. Refunded lines are not handled yet (see section 10).
- Thresholds are server constants and are not returned in responses: expiringWithinDays = 30, overdueAfterDays = 7, containerLongOpenDays = 14.
- Empty data returns zeros and empty arrays, never null. The only nullable number is deltaPercent.

## 3. Endpoint overview

| Endpoint                           | Kind     | Params                          | Manager tier          | Staff tier                                        |
| ---------------------------------- | -------- | ------------------------------- | --------------------- | ------------------------------------------------- |
| GET /inventory/summary             | Snapshot | none                            | Full                  | Low, out, expiring; no stockValue or draftBatches |
| GET /sales/summary                 | Snapshot | none                            | Full                  | Open containers only                              |
| GET /dashboard/attention           | Snapshot | none                            | Full                  | All counts; no draftBatches                       |
| GET /dashboard/summary             | Period   | from, to                        | Full; optional fields | Sales and cash only                               |
| GET /members/:memberId/performance | Period   | from, to; memberId accepts `me` | Any member in branch  | Own only; other member 403, outside scope 404     |
| GET /payments/summary              | Period   | from, to, groupBy=method        | Yes                   | Yes                                               |
| GET /dashboard/trend               | Period   | from, to, bucket                | Yes                   | 403                                               |

## 4. Feature summaries (snapshots)

Each summary is owned by its feature: `inventorySummary(ctx)` lives with inventory and `salesSummary(ctx)` with sales, and each is exposed as an endpoint for its page header strip. Neither module imports the other's service. Attention runs its own compact queries and uses the shared pure stock-status and unpaid predicates from `shared/utils`; it never calls a feature summary or reuses a response.

### 4.1 GET /inventory/summary

```ts
type InventorySummary = {
  asOf: string;
  draftBatches?: {
    count: number;
    oldest: {
      id: string;
      supplierName: string | null;
      createdAt: string;
      lineCount: number;
    } | null;
  };
  lowStock: { count: number; preview: string[] }; // up to 2 product names
  outOfStock: { count: number; preview: string[] };
  expiring: {
    expiredCount: number; // products
    expiringCount: number; // products
    earliest: { productName: string; expiryDate: string } | null;
  };
  stockValue?: number; // manager tier only
};
```

Definitions:

- Draft batches: StockBatch rows in the branch where confirmedAt is null. The oldest is chosen by createdAt. lineCount is its number of lines.
- Out of stock: active products with currentSealedStock <= 0.
- Low stock: active products with 0 < currentSealedStock <= threshold, where threshold is Product.lowStockThreshold, falling back to Business.lowStockDefaultThreshold. A product with neither threshold is never low stock. A product is counted in exactly one of low or out of stock.
- Expiring: only lots from confirmed batches (StockBatch.confirmedAt is not null) with quantityRemaining > 0 and an expiryDate. Counted per product. A product is in expiredCount if any of its lots has expiryDate < asOf. Otherwise it is in expiringCount if any lot has asOf <= expiryDate < asOf + 30 days. `earliest` is the lot with the smallest expiryDate across both groups. Inactive products are included, because their physical stock still expires.
- stockValue: sum over confirmed lots of remaining quantity times cost per base unit, using the shared pure costing helper in `apps/api/src/shared/utils`. Manager tier only.
- Staff tier responses omit `draftBatches` and `stockValue`; `lowStock`, `outOfStock`, and `expiring` remain.

### 4.2 GET /sales/summary

```ts
type SalesSummary = {
  asOf: string;
  outstanding?: {
    total: number; // SUM(balanceDue)
    unpaidCount: number;
    olderThan: { count: number; total: number }; // older than 7 days
  };
  openContainers: {
    count: number;
    longOpenCount: number; // open longer than 14 days
    longest: { productName: string; openedAt: string } | null;
  };
};
```

Definitions:

- Outstanding: sales in the branch with balanceDue > 0 and not voided. `olderThan` counts those with saleDatetime < asOf − 7 days. Never filtered by a period.
- Open containers: Container rows in the branch with status OPEN. longOpenCount counts openedAt < asOf − 14 days. `longest` is the earliest openedAt. Because the open-container sale flow is not built yet, this reads existing rows only and may return zeros until it is.
- Staff tier responses omit `outstanding` and contain only `openContainers`.

## 5. Dashboard and reporting endpoints

Sections 5.1–5.3 and 5.5 are dashboard-owned. Section 5.4 is a shared payments report, included here because the dashboard consumes it.

### 5.1 GET /dashboard/attention

No parameters. Returns the counts and anchors the needs-attention cards render. It does not return entity lists; the only array is the short stock-name preview. Each card opens a filtered list endpoint instead (see Drill-down lists below).

```ts
type Attention = {
  asOf: string;
  stock: {
    count: number;
    lowCount: number;
    outCount: number;
    preview: string[]; // up to 2 product names
  };
  expiring: {
    lotCount: number;
    expiredLotCount: number;
    expiringLotCount: number;
    earliest: { productName: string; expiryDate: string } | null;
  };
  unpaid: {
    count: number;
    total: number; // SUM(balanceDue)
    overdue: { count: number; total: number };
  };
  openContainers: { count: number; longOpenCount: number };
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

#### Algorithm

1. Record the server time as `asOf`, and derive the overdue cutoff as seven days before it and the expiry cutoff as thirty days after it.
2. Read the active products in the branch with their sealed stock and effective low-stock threshold.
3. Count each product as out of stock, low stock, or in stock. Out and low are exclusive; a product with no threshold is never low. Collect the first two product names for the preview.
4. Count the confirmed stock lots with remaining quantity whose expiry is before the expiry cutoff. Split them into already expired and expiring soon, and find the earliest expiry across both groups.
5. Sum the balance due and count the non-voided sales that still owe money. Sum and count the overdue subset.
6. Count the open containers and the subset open longer than fourteen days.
7. For manager roles only, count the draft batches and find the oldest by creation time with its line count.
8. Return the counts and anchors. Omit the draft-batch block for staff roles.

#### Repository aggregation

Prisma cannot compare two columns or filter by a computed status, so the repository returns the minimum supporting rows and the service finishes the classification.

- Stock: `product.findMany` for active products in the branch, selecting name, `currentSealedStock`, and `lowStockThreshold`, plus the business `lowStockDefaultThreshold`. The service applies the shared pure stock classifier from `apps/api/src/shared/utils`. The preview is taken from these rows, never from a second query.
- Expiring: two `stockBatchLine.count` calls through `stockBatch` for the branch and confirmed batches, both with `quantityRemaining > 0` and an `expiryDate`; one counts `expiryDate < asOf`, the other `asOf <= expiryDate < asOf + 30 days`. One `stockBatchLine.findFirst` ordered by `expiryDate` returns the earliest lot with its product name. Inactive products are included.
- Unpaid: `sale.aggregate` over non-voided branch sales with `balanceDue > 0`, `_sum: { balanceDue }` and `_count`. A second aggregate applies `saleDatetime < overdueBefore`; the service owns the seven-day rule.
- Open containers: `container.count` for `status = OPEN`, and a second count with `openedAt < asOf - 14 days`.
- Draft batches: `stockBatch.count` where `confirmedAt` is null, and `stockBatch.findFirst` ordered by `createdAt` with `_count: { lines }`. Both calls are skipped for staff.

#### Service aggregation and async

Start every category immediately and attach its transformation. No category waits for another; the only join is the final response.

```ts
const stock = repo.stockPositions(branchId).then(toStockCounts);
const expiredLots = repo.expiredLotCount(branchId, asOf);
const expiringLots = repo.expiringLotCount(branchId, asOf);
const earliestLot = repo.earliestExpiringLot(branchId, asOf);
const unpaid = repo.unpaidAggregate(branchId, asOf, overdueBefore).then(toUnpaid);
const containers = repo.openContainerAggregate(branchId, asOf).then(toContainers);
const drafts = isManager
  ? repo.draftBatchAggregate(branchId).then(toDraftBatches)
  : Promise.resolve(undefined);

const [
  stockResult,
  expiredCount,
  expiringCount,
  earliest,
  unpaidResult,
  containerResult,
  draftResult,
] = await Promise.all([stock, expiredLots, expiringLots, earliestLot, unpaid, containers, drafts]);
```

- The expiring counts and earliest lot are independent queries. The final `Promise.all` is the response join and necessarily waits for every category.
- Keep dependent work inside its branch: the earliest lot loads its product name in the same query rather than issuing a second lookup.
- Do not import or call another feature's service. Attention uses its own repository and shared pure predicates; calling `inventorySummary` or `salesSummary` would compute fields it discards.
- If one repository call fails, the request fails. Do not use `allSettled`.
- Do not wrap the whole request in one interactive transaction.

#### Field definitions

- `asOf`: the server time used for every snapshot count.
- `stock.count`: total active products low or out of stock. `lowCount` and `outCount` are exclusive and add up to `count`. `preview`: up to two product names, out-of-stock first, then low-stock, each ordered by name. No ids or statuses are returned.
- `expiring.lotCount`: confirmed lots with remaining quantity expiring before the thirty-day cutoff. It includes already-expired lots and equals `expiredLotCount + expiringLotCount`. `earliest`: the earliest-expiring lot across both groups, with its product name and expiry; null when no lot qualifies.
- `unpaid.count`: non-voided sales with `balanceDue > 0`. `unpaid.total`: the sum of those balances. `unpaid.overdue`: the subset older than seven days; its count and total are always less than or equal to the parent figures.
- `openContainers.count`: open containers in the branch. `longOpenCount`: those opened more than fourteen days ago.
- `draftBatches.count`: batches with `confirmedAt` null. `oldest`: the earliest-created draft with its supplier, creation time, and line count; null when none exist.
- Money values are rounded to two decimals at output, counts are integers, and timestamps are ISO strings. Empty categories return zero; nullable anchors return null.

Rules:

- Every role receives stock, expiring, unpaid, and openContainers. draftBatches is omitted for roles that cannot open stock intake (default: staff tier), and its queries are skipped.
- Attention returns no entity lists. Counts are full totals, not the length of a preview.
- Stock uses the shared pure effective-threshold classifier from `apps/api/src/shared/utils`. Low and out are mutually exclusive; out-of-stock products are active products at or below zero.
- Expiring counts lots, not products. Expired lots are included because they are the most urgent. Inactive products are included because their physical stock still expires.
- Unpaid is every non-voided sale with a positive balance, not only sales older than seven days. The overdue subset is the seven-day slice.
- The stock and unpaid figures use the same definitions as the feature summaries, so they cannot disagree with those headers. Expiring counts lots here; the inventory summary keeps its product-level expiry count for its own header strip.

#### Drill-down lists

Each attention row opens a feature list, already filtered. The list endpoint owns the items and sorting; attention only supplies the counts and anchors. List pagination is deferred (section 10).

| Attention row   | Filtered endpoint                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Low or out      | `GET /api/businesses/:businessId/inventory/products?status=active&stockStatus=low_stock,out_of_stock` |
| Expiring        | `GET /api/businesses/:businessId/inventory/products?status=all&expiryStatus=expired,soon`             |
| Unpaid          | `GET /api/businesses/:businessId/sales?unpaid=true`                                                   |
| Overdue         | `GET /api/businesses/:businessId/sales?unpaid=true&overdue=true`                                      |
| Open containers | `GET /api/businesses/:businessId/containers?status=OPEN&openLongerThanDays=14`                        |
| Draft batches   | `GET /api/businesses/:businessId/inventory/batches?status=draft` (manager tier only)                  |

- The low/out and expiring lists return `ProductInventorySummaryResponse[]`. The expiring list adds `expiry.earliestExpiryDate`; sum `expiry.lotCount` across its items to match `attention.expiring.lotCount`.
- The unpaid and overdue lists return `SaleSummaryResponse[]` with `taxAmount`, `amountPaid`, and `balanceDue`.
- The containers endpoint is a target contract; the module is not built. Its items are `{ id, productId, productName, initialMouQty, remainingMouQty, openedAt }[]`.
- The draft batch list returns `StockBatchDetailResponse[]`, requires manager access, and returns 403 for staff, matching the omitted attention block.
- The low/out list is active-only, matching the count. The expiring list uses `status=all` so inactive products with stock are included, matching the count.

### 5.2 GET /dashboard/summary

Params: `from`, `to`. The response is one shape; role-restricted fields are omitted for callers without access.

```ts
type DashboardSummary = {
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

- `grossProfit`, `outstanding`, and `losses` are manager-tier fields. They are omitted from a staff-tier response.
- `asOf` is the server time recorded for the snapshot. It is not the period end. Staff responses include it even though they have no outstanding field.
- Trend is a separate endpoint (section 5.5). The summary does not include it and does not wait for it.

#### Algorithm

1. Take the period start and end; reject an invalid range or one longer than 366 days.
2. Record the server time used for snapshot figures, and derive the overdue cutoff as seven days before that time.
3. Calculate the current period's sales total, tax total, and sale count from non-voided sales. Every role receives these figures.
4. Calculate cash collected as the sum and count of payments received in the period. Every role receives this figure.
5. For manager roles only, define the previous period as the same length immediately before the current period, and calculate sales and cost of goods sold for both periods.
6. For manager roles only, calculate gross profit for each period as sales total minus tax minus cost of goods sold. Calculate the percentage change from previous to current; leave it empty when previous is zero or negative.
7. For manager roles only, calculate outstanding as the sum and count of non-voided sales with a positive balance. Calculate overdue as the subset older than the overdue cutoff.
8. For manager roles only, calculate losses as lost standard quantity valued at the lot's cost per base unit, and count the loss records.
9. Return the period, snapshot time, sales, and cash to every role. Add gross profit, outstanding, and losses only for manager roles.

#### Repository aggregation

Prisma cannot sum expressions, so the repository aggregates only stored scalar columns and returns the minimum supporting rows for the rest.

- Sales current: `aggregate` over non-voided branch sales in the range, `_sum: { total, taxAmount }`, `_count`. This runs for every role. The previous-period sales aggregate runs only for manager roles.
- Cash collected: `payment.aggregate` where `paidAt` is in the range and the sale is in the branch and not voided; `_sum: { amount }`, `_count`. This runs for every role.
- Outstanding: `sale.aggregate` where the sale is in the branch, not voided, and `balanceDue > 0`; `_sum: { balanceDue }`, `_count`. Pass `overdueBefore = asOf − 7 days` into the repository and return a second aggregate with `saleDatetime < overdueBefore`. The repository applies the date filter; the service owns the 7-day rule. Manager roles only.
- COGS current/previous: `saleLineCost.groupBy` by `stockBatchLineId` and `unitCost`, `_sum: { quantityPulled }`, filtered through `saleLine.sale` by branch, time, and non-voided status. This returns one row per lot/cost, not one per cost row. The repository returns the grouped rows plus the referenced lot fields; the service converts and sums. Manager roles only.
- Losses: `loss.groupBy` by `stockBatchLineId`, `_sum: { standardQuantity }`, `_count`, filtered by `createdAt` and the branch through `stockBatchLine.stockBatch`. There is no money column on `Loss`; the repository returns the grouped quantities plus the referenced lot fields, and the service prices them. `losses.count` is the sum of the per-group counts, not the number of groups. Manager roles only.

#### Service aggregation and async

Start the queries every role needs immediately. Only manager roles start the manager-only branch.

```ts
const salesCur = repo.salesAggregate({ branchId, from, to }).then(toSales);
const cash = repo.cashAggregate({ branchId, from, to }).then(toCash);

if (!isManager) {
  const [sales, cashResult] = await Promise.all([salesCur, cash]);
  return { period, asOf, sales, cashCollected: cashResult };
}

const salesPrev = repo.salesAggregate({ branchId, from: prevFrom, to: from }).then(toSales);
const cogsCur = repo.cogsAggregate({ branchId, from, to }).then(toCogs);
const cogsPrev = repo.cogsAggregate({ branchId, from: prevFrom, to: from }).then(toCogs);
const outstanding = repo
  .outstandingAggregate({ branchId, asOf, overdueBefore })
  .then(toOutstanding);
const losses = repo.lossesAggregate({ branchId, from, to }).then(toLosses);

const grossProfitCur = Promise.all([salesCur, cogsCur]).then(combineGrossProfit);
const grossProfitPrev = Promise.all([salesPrev, cogsPrev]).then(combineGrossProfit);

const [sales, cashResult, grossProfit, previousGrossProfit, outstandingResult, lossResult] =
  await Promise.all([salesCur, cash, grossProfitCur, grossProfitPrev, outstanding, losses]);
```

- The staff branch returns before any manager-only query starts. Do not fetch gross profit, outstanding, or losses and then omit them from the response.
- `Promise.all` is used only at dependency joins: gross profit waits for its sales/COGS pair, not for cash, outstanding, or losses. The final `Promise.all` is the response join and necessarily waits for every returned field.
- Keep dependent work inside its branch: if a repository call needs a second bounded query (for example, lot context), chain it to that call. Do not wait for unrelated metrics to resolve first.
- Keep Prisma `Decimal` values through the arithmetic; convert to numbers only when serializing.
- If one repository call fails, the request fails. Do not use `allSettled` unless partial success is an explicit contract.
- Do not wrap the whole request in one interactive transaction; it serializes the queries. If exact snapshot consistency is required, accept that cost or use a read replica/snapshot outside the default path.

#### Field definitions

- `period`: the requested range.
- `asOf`: the server time used for snapshot figures.
- `sales.total`: sales value including tax. `sales.count`: number of non-voided sale rows, not lines.
- `grossProfit.value`: gross profit for the current period. `grossProfit.previous`: gross profit for the previous period. `grossProfit.deltaPercent`: percentage change from previous to current; null when previous is zero or negative. Manager tier only.
- `cashCollected.total`: payments received in the period. `cashCollected.paymentCount`: number of payment rows, not sales. Every role receives this field.
- `outstanding.total`: balance due on non-voided sales at the snapshot time; ignores the requested period. `outstanding.count`: number of such sales. `outstanding.overdue`: the subset older than seven days. Manager tier only.
- `losses.total`: monetary value of losses recorded in the period, valued at cost. `losses.count`: number of loss rows, summed across the grouped lots. Manager tier only.
- Manager-only fields are absent for staff, and their repository queries are not run.
- Money values are rounded to two decimals at output, counts are integers, and timestamps are ISO strings.

Rules:

- All sales figures exclude voided sales.
- `sales.total` includes tax. Gross profit uses tax-excluded revenue.
- Cash collected is by `paidAt`, not by sale date, and does not filter by payment status.
- Outstanding is a snapshot and ignores `from` and `to`.
- Staff responses omit the manager-only fields, and the service skips their queries instead of computing then discarding them.
- Refunds are deferred.

### 5.3 GET /api/businesses/:businessId/members/:memberId/performance

Params: path `businessId`, `memberId` (a member id, or `me` for the caller), and query `from`, `to`. Returns one member's figures for the period, scoped to the session branch. The canonical contract lives in `members.md`; the dashboard calls it with `memberId=me`, and member management reuses it with an explicit id.

Access rules:

- Manager tier: any member of the same business in the session branch, active or inactive.
- Staff tier: only themselves, by `me` or by their own id.
- A staff request for another member in the same business and branch returns 403.
- An unknown member id, one belonging to another business, or one outside the session branch returns 404. Never resolve a member outside the caller's scope.

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

Definitions:

- Member's sales: non-voided sales in the branch and period where `processedByMemberId` or `serverMemberId` equals the member. The OR is a row predicate, so a sale where the member is both counts once. Total is SUM(Sale.total), including tax; count is sale rows, not lines.
- Cash collected: SUM(Payment.amount) where `Payment.businessMemberId` is the member, `paidAt` is in the period, and the sale is in the branch and not voided. Credit goes to whoever recorded the payment, not to whoever made the sale.
- Unpaid sales: the current count of the member's period sales that have `balanceDue > 0`; `asOf` is the snapshot time. This is not every unpaid sale the member ever made.
- Attribution overlaps: a sale processed by one member and served by another appears in both performances. Member rows are not a partition, so never add them to get a team total.

#### Algorithm

1. Validate the period, resolve the target member, and apply the access rules.
2. Read the member's name and role.
3. Calculate the member's sales total and sale count for the period.
4. Calculate the member's recorded cash for the period.
5. Count the member's period sales that currently have a positive balance.
6. Return the member, period, snapshot time, and the three figures.

#### Repository aggregation

- Member lookup: `businessMember.findFirst` by id, business, and branch scope. An unknown, out-of-business, or out-of-branch id is 404. After the lookup, a staff caller requesting a different member receives 403.
- Sales: `sale.aggregate` with `_sum: { total }`, `_count`, non-voided, branch, period, and the processor/server OR predicate. No dedupe pass is needed.
- Cash: `payment.aggregate` where the member recorded it, `paidAt` is in the period, and the sale is in the branch and not voided; `_sum: { amount }`.
- Unpaid: `sale.count` with the same member-sales predicate plus `balanceDue > 0`. This is a current snapshot, not a period condition.

#### Service aggregation and async

Member access is the only dependency. Validate it first, then start the three aggregates in parallel.

```ts
const member = await repo.getMember(businessId, branchId, targetMemberId);
assertAccess(actor, member);

const sales = repo.memberSalesAggregate({ branchId, memberId: member.id, from, to }).then(toSales);
const cash = repo.memberCashAggregate({ branchId, memberId: member.id, from, to }).then(toCash);
const unpaid = repo.memberUnpaidCount({ branchId, memberId: member.id, from, to });

const [salesResult, cashResult, unpaidCount] = await Promise.all([sales, cash, unpaid]);
```

- Do not run the aggregates before access is resolved.
- No groupBy is needed; these are three scalar reads.
- Keep Prisma `Decimal` values through the arithmetic; convert to numbers only when serializing.

### 5.4 GET /api/businesses/:businessId/payments/summary

Params: `from`, `to`, `groupBy=method` (optional; defaults to and currently accepts only `method`). Shop-wide, all roles. This is a payments report, not a dashboard-owned read: the dashboard's Payment methods card consumes it, and the payments page can reuse it.

```ts
type PaymentSummary = {
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

- Source: Payment rows with `paidAt` in the period, grouped by method, with the sale in the branch and not voided.
- `total` is the sum of the method totals. Do not run a separate total aggregate; deriving it from the groups keeps the two figures consistent.
- `paymentCount` is the number of payment rows for that method, not the number of sales.
- `sharePercent` is `method.total / total * 100`, rounded to two decimals. Rounded shares may not sum to exactly 100.
- Methods with no payments are omitted. Sort by total descending, then method name ascending so ties are deterministic.
- An empty period returns `total: 0` and `methods: []`; no division by zero and no zero rows.
- This is one `groupBy` query plus service arithmetic, so there is no async fan-out to optimize.
- `total` must equal `summary.cashCollected.total` for the same range.

### 5.5 GET /dashboard/trend

Params: `from`, `to`, `bucket` (`hour` or `day`, optional). Manager tier only; staff tier receives 403. Trend is separate from summary so it never blocks the summary response.

```ts
type Trend = {
  period: { from: string; to: string };
  bucket: 'hour' | 'day';
  points: { start: string; grossProfit: number }[];
};
```

#### Algorithm

1. Take the period start, end, and optional bucket. Reject invalid ranges; choose hourly buckets for spans of 48 hours or less and daily buckets otherwise; reject hourly above 48 hours and daily above 366 days.
2. Create every bucket from the start to the end in one-hour or one-day steps.
3. Calculate revenue for each sale timestamp in the period as sales total minus tax from non-voided sales.
4. Calculate cost for each sale line and lot as pulled quantity times cost per base unit, and associate it with the sale timestamp.
5. Assign revenue and cost to the bucket containing the sale timestamp.
6. Calculate gross profit per bucket as revenue minus cost. Fill empty buckets with zero.
7. Return the period, bucket, and points.

#### Repository aggregation

- Sales by timestamp: `sale.groupBy` by `saleDatetime`, `_sum: { total, taxAmount }`, `_count`, filtered by branch, range, and non-voided.
- Cost groups: `saleLineCost.groupBy` by `saleLineId`, `stockBatchLineId`, and `unitCost`, `_sum: { quantityPulled }`, filtered through `saleLine.sale`.
- Sale-line map: for the cost `saleLineId`s, fetch only `id` and `sale.saleDatetime`.
- Lot context: load the referenced `StockBatchLine` and product-unit fields needed to convert purchase-unit cost to cost per base unit.

#### Service aggregation and async

Start the sales-by-timestamp and cost-group queries together. After the cost groups resolve, fetch the sale-line map and lot context in parallel. Then compute:

- Revenue per timestamp: `total − taxAmount`.
- Cost per cost group: `quantityPulled × cost per base unit`.
- Map each cost group to its sale's `saleDatetime` through the sale-line map.
- Bucket revenue and cost by `saleDatetime` starting at `from`; each point is bucket revenue minus bucket cost.
- Fill every bucket with `0` when empty.

```ts
const salesByTime = repo.salesByTimestamp({ branchId, from, to });
const costData = repo.costGroups({ branchId, from, to }).then(async (costs) => {
  const [lineMap, lotContext] = await Promise.all([
    repo.saleLineMap(costs.map((cost) => cost.saleLineId)),
    repo.lotContext(costs.map((cost) => cost.stockBatchLineId)),
  ]);
  return { costs, lineMap, lotContext };
});

const [salesTimes, { costs, lineMap, lotContext }] = await Promise.all([salesByTime, costData]);

const points = buildTrend({ from, to, bucket, salesTimes, costs, lineMap, lotContext });
```

- Do not include the trend query in the summary's `Promise.all`; that is why it is a separate endpoint. A slow trend call affects only the trend card.
- If one repository call fails, the trend request fails. Do not use `allSettled` by default.
- Trend is the highest-cardinality endpoint under the no-migration constraint: it returns per-timestamp and per-line groups to the service, not all cost rows. If it becomes too heavy, the contract needs a cached/rollup design later.

Rules:

- Buckets start at `from` and advance in steps of exactly 1 hour or 24 hours, so no timezone is needed. The last bucket may be partial and ends at `to`.
- A sale belongs to the bucket containing its saleDatetime. Each point is gross profit by the same definition as 5.2.
- Empty buckets are returned with `0` so the line is continuous.
- If `bucket` is omitted: `hour` when the span is 48 hours or less, otherwise `day`. Explicit `hour` above 48 hours, or `day` above 366 days, returns 400.
- The client sends `bucket=hour` for Today and `bucket=day` otherwise.

## 6. Role matrix

| Data                                 | Manager tier | Staff tier            |
| ------------------------------------ | ------------ | --------------------- |
| Gross profit, losses, trend          | Yes          | No                    |
| Sales and cash collected (shop-wide) | Yes          | Yes                   |
| Outstanding                          | Yes          | Attention row only    |
| Stock value                          | Yes          | No                    |
| Needs attention counts               | All          | All; no draft batches |
| Member performance                   | Any member   | Own only              |
| Payment methods                      | Yes          | Yes                   |

## 7. Drill-down filters required on list endpoints

Every card links to a feature list, pre-filtered. These are the first filters the search and filtering work should provide. The containers endpoint is a target contract; the other destinations already exist.

| Card                | Destination        | Filter                                             |
| ------------------- | ------------------ | -------------------------------------------------- |
| Low or out of stock | Inventory products | `status=active&stockStatus=low_stock,out_of_stock` |
| Expiring            | Inventory products | `status=all&expiryStatus=expired,soon`             |
| Unpaid              | Sales              | `unpaid=true`                                      |
| Overdue             | Sales              | `unpaid=true&overdue=true`                         |
| Outstanding         | Sales              | `unpaid=true`                                      |
| Open containers     | Containers         | `status=OPEN&openLongerThanDays=14`                |
| Draft batches       | Inventory batches  | `status=draft`, manager tier only                  |
| Sales               | Sales              | `from`, `to`                                       |
| Cash collected      | Payments           | `from`, `to`                                       |
| Losses              | Losses             | `from`, `to`                                       |

## 8. Consistency rules (write these as tests)

1. The sum of trend points equals summary.grossProfit.value for the same range, even though trend is a separate endpoint.
2. `paymentSummary.total` equals `summary.cashCollected.total` for the same range, and equals the sum of its method totals.
3. Attention and the feature summaries import the same pure stock-status and unpaid predicates from `shared/utils`; neither calls the other's service.
4. `attention.stock.count` equals `lowCount + outCount`, and every low/out product is counted exactly once.
5. `attention.expiring.lotCount` equals `expiredLotCount + expiringLotCount`.
6. `attention.unpaid.overdue.count` is never greater than `unpaid.count`, and `overdue.total` is never greater than `unpaid.total`.
7. Attention returns no entity lists; `stock.preview.length` is at most two names.
8. The low/out list total equals `attention.stock.count`, and the expiring list total equals `attention.expiring.lotCount` for the same snapshot.
9. A staff-tier dashboard summary omits grossProfit, outstanding, and losses, and the service does not run their queries. Staff requests to /dashboard/trend return 403.
10. Summary and trend import the same pure costing and conversion helpers from `shared/utils`; neither copies them or imports a feature service.
11. /members/me/performance returns the same figures as /members/\<own id>/performance. A staff request for another member in the same business and branch returns 403; an unknown or out-of-scope id returns 404.
12. Member performance rows may overlap when one member processed a sale and another served it. Do not sum member rows as a team total.
13. A payment method's `paymentCount` counts payment rows, not sales, and rounded `sharePercent` values may not sum to exactly 100.

## 9. Performance and loading

Server:

- Aggregate in the database with Prisma `aggregate` and `groupBy`. Do not load raw rows when a scalar aggregate exists; loops are only over the bounded lot, sale-line, and timestamp groups.
- Attention loads only counts and anchors. It never imports or calls a feature service and never loads product, sale, container, or batch lists; the only product rows it reads are the active stock positions needed for low/out classification.
- Suggested indexes: Sale(branchId, saleDatetime), Payment(paidAt), Payment(businessMemberId, paidAt), Loss(createdAt), StockBatchLine(expiryDate), StockBatch(branchId, confirmedAt), Container(branchId, status), Product(branchId, active). For outstanding, use the existing branch index; no partial index in this pass because there is no migration.
- No caching in version one. If attention becomes slow, add a 30 to 60 second server cache for that endpoint only.

Client:

- Each section is its own request with its own skeleton, fired in parallel.
- Changing the period filter refetches summary, member performance, payment summary, and trend. It does not refetch attention.
- Attention refetches on screen focus and after stock, sale, or payment mutations.

## 10. Deferred work and open items

Deferred: team performance, further cards (top debtors, slow movers, loss by reason, recent activity, container deviations), business timezone, and the open-container sale flow.

Open decisions:

1. Low stock threshold unit: the spec assumes thresholds are in the same unit as currentSealedStock (base unit).
2. Drill-down lists are still unpaginated. Add pagination to the feature list endpoints when the lists grow.
3. Refunds and voids: when built, revisit net sales, cost of goods sold, cash collected (likely negative payments), outstanding, and stock recomputation in every endpoint above.
