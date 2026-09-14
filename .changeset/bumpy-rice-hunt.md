---
'@mez/validation': minor
'@mez/types': minor
'api': minor
'web': minor
---

Implement owner profile viewing and editing

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
