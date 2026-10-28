---
'api': minor
---

Use the authenticated user's name when provisioning owners and members

- JWT verification now reads `user_metadata.full_name` and passes it through
  auth resolution.
- New owners are created with the provided name, falling back to `"New User"`
  when it is absent.
- The OWNER business member now uses the owner's name instead of the literal
  `"me"`.
