---
'@mez/validation': minor
'@mez/types': minor
'api': minor
'web': minor
---

Implement business profile viewing and updating

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
