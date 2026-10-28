---
'@mez/types': minor
---

Refine shared auth contracts for signup and password flows

- Added `name` to `SignupCredentials`.
- Added shared form types: `LoginFormValues`, `SignupFormValues`,
  `ForgotPasswordFormValues`, `NewPasswordFormValues`, and
  `ChangePasswordFormValues`.
- Moved web-only auth service, user, and session contracts out of the shared
  package.
- Removed the shared `AuthService`, `User`, and `AuthSession` exports.
