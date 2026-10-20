# Members

## Purpose

Members are the people attached to a business: Owner, Manager, Cashier, and Server. A Server is a member with role `SERVER` who is attribution-only (they typically do not log in) and can be tagged on a sale as the person who took the order, separate from whoever processed the sale.

## API Endpoints

Every route is business-scoped: the business and its default branch come from the session plus the `:businessId` route param, and the acting member from the resolved identity. None of these are ever accepted from the request body.

| Method | Path                                                        | Request                     | Success                               |
| ------ | ----------------------------------------------------------- | --------------------------- | ------------------------------------- |
| GET    | `/api/businesses/:businessId/members`                       | `MemberListFilters` (query) | `200 BusinessMemberSummaryResponse[]` |
| GET    | `/api/businesses/:businessId/members/:memberId/performance` | `from`, `to` (query)        | `200 MemberPerformanceResponse`       |

### GET /api/businesses/:businessId/members

Lists the business's active members by name, narrowed by the query filters. The response is a bare array of summaries suitable for a picker (id, name, role).

Query: `?role=SERVER` (case-insensitive; normalized to `SERVER`). If omitted, all active members of the business are returned.

```
Client -> Authorization: Bearer <jwt>
  -> auth middleware resolves the owner
  -> business middleware resolves the scope
  -> validation middleware accepts optional role filter
  -> repository returns active members scoped to the business and branch, by name
  -> 200 [ { id, name, role }, ... ]
```

An empty list is a `200` with an empty array. All members returned are `active = true`. `role` must be one of `OWNER`, `MANAGER`, `CASHIER`, `SERVER`. Read is open to any authenticated member of the business.

### GET /api/businesses/:businessId/members/:memberId/performance

Returns one member's sales, recorded cash, and current unpaid-sale count for a period. The dashboard uses it for the signed-in member with `memberId=me`; member management can call it with an explicit id. The figures are scoped to the session branch.

Query: `from`, `to` (inclusive). `memberId` is a member id or `me`.

```ts
type MemberPerformanceResponse = {
  member: {
    id: string;
    name: string;
    role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'SERVER';
  };
  period: { from: string; to: string };
  asOf: string;
  sales: { total: number; count: number };
  cashCollected: number;
  unpaidSalesCount: number;
};
```

Access:

- Manager tier: any member of the same business in the session branch, active or inactive.
- Staff tier: only themselves, by `me` or by their own id.
- A staff request for another member in the same business and branch returns `403`.
- An unknown member id, one belonging to another business, or one outside the session branch returns `404`. Never resolve a member outside the caller's scope.

Definitions:

- `sales.total` is the sum of `Sale.total` for non-voided sales in the period where `processedByMemberId` or `serverMemberId` is the member. It includes tax.
- `sales.count` counts sale rows, not lines. When the member is both processor and server, the OR still counts the sale once.
- `cashCollected` is the sum of `Payment.amount` where `Payment.businessMemberId` is the member, `paidAt` is in the period, and the sale is in the branch and not voided. Credit goes to whoever recorded the payment, not whoever made the sale.
- `unpaidSalesCount` is the current number of the member's period sales with `balanceDue > 0`. It is not every unpaid sale the member ever made; `asOf` is the snapshot time.
- Member rows are not a partition. A sale processed by one member and served by another appears in both performances, so summing members does not produce a team total.

Algorithm:

1. Validate the period, resolve the target member, and apply the access rules.
2. Read the member's name and role.
3. Calculate the member's sales total and sale count for the period.
4. Calculate the member's recorded cash for the period.
5. Count the member's period sales with a positive balance.
6. Return the member, period, snapshot time, and the three figures.

Repository aggregation:

- Member lookup: `businessMember.findFirst` by id, business, and branch.
- Sales: `sale.aggregate` with `_sum: { total }`, `_count`, non-voided, branch, period, and the processor/server OR predicate. No dedupe pass is needed.
- Cash: `payment.aggregate` where the member recorded it, `paidAt` is in the period, and the sale is in the branch and not voided; `_sum: { amount }`.
- Unpaid: `sale.count` with the same member-sales predicate plus `balanceDue > 0`.

Access is the only dependency. Resolve it first, then start the three reads in parallel.

```ts
const member = await repo.getMember(businessId, branchId, targetMemberId);
assertAccess(actor, member);

const sales = repo.memberSalesAggregate({ branchId, memberId: member.id, from, to }).then(toSales);
const cash = repo.memberCashAggregate({ branchId, memberId: member.id, from, to }).then(toCash);
const unpaid = repo.memberUnpaidCount({ branchId, memberId: member.id, from, to });

const [salesResult, cashResult, unpaidCount] = await Promise.all([sales, cash, unpaid]);
```

Keep Prisma `Decimal` values through the arithmetic; convert to numbers only when serializing.

### Roles

Any authenticated member of the business (including `SERVER`) can read the member list for the purpose of selecting attribution. Performance follows the access rules above. No write endpoints are defined here.

### Error concepts

- Unauthenticated request
- Not your business / no active member in the business (404)
- Unknown member id or a member outside the business/branch (404)
- Staff requesting another member in the same business and branch (403)
- Invalid role filter (400)
- Invalid performance period (400)
