---
'@mez/validation': minor
---

Add signup name and password lifecycle validation

- Signup now requires a name
- Added `forgotPasswordSchema`, `newPasswordSchema`, and `changePasswordSchema`.
- Exported the new schemas and added `validateForgotPasswordValues` and
  `validateNewPasswordValues` parsers.
- `LoginFormValues` and `SignupFormValues` are now sourced from `@mez/types`
  instead of being re-exported by this package.
