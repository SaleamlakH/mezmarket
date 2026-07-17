---
'@mez/validation': minor
'@mez/types': minor
'web': minor
---

- **web**:
  - Implemented authentication flows, including dedicated Login and Signup pages powered by Supabase Auth.
  - Added protected route guarding to automatically restrict access based on user session status.
  - Introduced a global error boundary and a custom 404 page to gracefully catch failed or unmatched routes.
- **packages/type**: Created a new shared package containing common TypeScript definitions and authentication types.
- **packages/validation**: Created a new shared package for input validation schemas used across the workspace.
