# Members

## Purpose

Members are the people attached to a business: Owner, Manager, Cashier, and Server. A Server is a member with role `SERVER` who is attribution-only (they typically do not log in) and can be tagged on a sale as the person who took the order, separate from whoever processed the sale.

## API Endpoints

Every route is business-scoped: the business and its default branch come from the session plus the `:businessId` route param, and the acting member from the resolved identity. None of these are ever accepted from the request body.

| Method | Path                                  | Request                     | Success                               |
| ------ | ------------------------------------- | --------------------------- | ------------------------------------- |
| GET    | `/api/businesses/:businessId/members` | `MemberListFilters` (query) | `200 BusinessMemberSummaryResponse[]` |

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

### Roles

Any authenticated member of the business (including `SERVER`) can read members for the purpose of selecting attribution. No write endpoints are defined here.

### Error concepts

- Unauthenticated request
- Not your business / no active member in the business (404)
- Invalid role filter (400)
