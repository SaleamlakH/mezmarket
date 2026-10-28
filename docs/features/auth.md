# Auth

## Purpose

Auth is how a person gets an owner account and how the API knows which owner is
acting. Supabase Auth owns credentials and sessions; this app owns the owner
record and the account lifecycle around it — signup, email verification, login,
password reset, password change, and logout.

Every protected API request carries a Supabase JWT. The API verifies it, resolves
the provider user to exactly one owner, and uses that owner for the rest of the
request. The API never re-authenticates the user and never stores a password.

Owner contact details are a separate concern; see
[owner-profile.md](owner-profile.md).

## Concept model

- Supabase Auth is the source of truth for credentials, email confirmation,
  one-time codes, and sessions. The app stores no password or password hash.

- An `AccountIdentity` maps a Supabase user id to exactly one `Owner`. The owner
  is the business-facing identity used by the rest of the app.

- The owner is provisioned lazily on the first authenticated API request, not at
  signup. The full name stored in Supabase user metadata becomes the owner name,
  falling back to `New User`; the token's email becomes the owner's contact email
  when present. The link is idempotent: later requests reuse the same owner.

- Email verification is the gate to the app. An authenticated session without a
  confirmed email is sent to verification before any business route loads.

- Signup collects a full name, email, and password. The name is stored as
  Supabase user metadata and becomes the owner name when the owner is provisioned.

- Changing a password from inside the app also requires the current password.
  Resetting a forgotten password does not.

- Verification and reset use a 6-digit email code. Resend is available after a
  60-second client-side cooldown.

- Normal logout is local to the current browser. Password change and password
  reset sign the account out globally.

- The login email is the credential. The contact email on the owner profile is
  separate and is never used to sign in.

## Frontend UI flow

### Signup and email verification

- `/signup` is guest-only. It asks for full name, email, password, and password
  confirmation, and reports a duplicate email as an account that already exists.

- If Supabase returns a confirmed user immediately, signup opens the app.
  Otherwise it opens `/verify-email` with a "Verification code sent" notice.

- `/verify-email` shows the pending email and a 6-digit code input. Verify email
  opens the app once the code is accepted. Resend starts at a 60-second countdown
  after each send. "Sign up again" starts over with a different email.

- An unverified login sends a fresh signup code and opens the verification screen
  instead of the app.

### Login

- `/login` is guest-only. It asks for email and password and links to the reset
  flow. A successful login opens the app.

- Completing a password reset returns to login with a "Password updated" notice.
  Dismissing the notice clears it from history.

### Password reset

- `/forgot-password` is the signed-out recovery flow. An authenticated user with a
  verified email is redirected into the app unless a reset is already in progress.

- The flow has three steps: enter email, enter the 6-digit recovery code, choose a
  new password. The email step is worded as "if an account exists" rather than
  confirming whether the email is registered.

- The code step supports resend after the same 60-second cooldown and "Use
  Different Email" restarts the flow. The new-password step applies the same rules
  as signup and does not ask for the old password.

- Saving the new password signs the account out globally and returns to login with
  the "Password updated" notice.

### Change password and logout

- Settings → Profile → Security shows the account's last update time and a Change
  password action. The dialog asks for current password, new password, and
  confirmation.

- A successful change signs the account out globally and returns to login. There
  is no success banner because the session is gone; the next login uses the new
  password. If the password changed but global sign-out failed, the dialog shows
  an explicit message asking the user to sign out manually.

- Logout is available from Settings and the sidebar. It signs out the current
  browser only, without a confirmation dialog. A failed logout surfaces an error
  and leaves the session in place.

### Route guards

- `/login` and `/signup` redirect authenticated users into the app.

- Every business route requires an authenticated user with a confirmed email. A
  guest is sent to `/login`; an unverified user is sent to `/verify-email`.

- While the session is loading, guarded screens show the brand mark instead of
  redirecting.

## Auth operations

There are no first-party auth HTTP endpoints. The web client talks to Supabase
Auth directly.

| Operation            | Entry point                        | Result                                                                   |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| Sign up              | `/signup`                          | Creates the user with full-name metadata                                 |
| Verify email         | `/verify-email`                    | Confirms the email and starts a session                                  |
| Resend signup code   | Unverified login or verification   | Sends a new 6-digit code                                                 |
| Log in               | `/login`                           | Starts a session                                                         |
| Request reset        | `/forgot-password`                 | Sends a recovery code if the account exists                              |
| Verify recovery code | Reset code step                    | Authorizes the new-password step                                         |
| Update password      | Reset or Change password           | Sets the new password; current password only in the change flow          |
| Sign out             | Settings, sidebar, password change | Clears the session locally, or globally after a password change or reset |

## Protected API requests

`/health` and `/api/units` are public. Every other `/api` route requires a
Supabase JWT.

| Route class             | Authentication                |
| ----------------------- | ----------------------------- |
| `/health`, `/api/units` | Public                        |
| Other `/api/*` routes   | `Authorization: Bearer <jwt>` |

```
Client -> Authorization: Bearer <supabase jwt> -> /api/*
   -> verify the JWT against Supabase's signing keys
   -> extract the provider user id, email, and full name
   -> find the linked AccountIdentity, or create the Owner and
      AccountIdentity on the first request
   -> req.auth = { ownerId }
   -> route handler
```

The provider user id is the only value used to link an identity. The email and
name are read from the verified token, never from the request body.

## Error concepts

- Missing or non-Bearer `Authorization` header: `401 UNAUTHORIZED`
  ("Missing token").
- Invalid or unverifiable token, or a token without a provider user id: `401
UNAUTHORIZED` ("Invalid token").
- Unexpected failure during identity resolution: `500 INTERNAL_ERROR`.
- Duplicate signup email: the account already exists; log in instead.
- Unverified login: the app resends a signup code and opens verification.
- Invalid or expired code: shown on the verification or reset screen.
- Weak password or mismatched confirmation: reported per field before submit.
- Wrong current password: shown in the Change password dialog.
- Failed logout: shown to the user, and the session remains.
- Password changed but global sign-out failed: the dialog asks the user to sign
  out manually.

Every API failure is delivered as a structured error envelope by the global error
handler; see [error-handling.md](error-handling.md).

## Limitations

- **No account deletion.** Owners cannot delete their account or their owner
  record from the app.
- **The Security card's "last changed" is the account update time.** It is not a
  password-specific timestamp.

## Design rationale / invariants

- **Credentials stay with Supabase.** The app never receives, stores, or hashes a
  password, and the API never re-authenticates a user.
- **Identity is linked once, then reused.** `AccountIdentity` decouples the owner
  from the auth provider, and provisioning is lazy and idempotent.
- **Owner details are app-owned after provisioning.** The owner name and contact
  email are set from the first authenticated request, then changed through the
  owner profile rather than the auth provider.
- **Scope comes from the session.** The API derives the owner id from the token;
  no request body can choose which owner is acting.
- **Verification is enforced before business data.** The web app keeps unverified
  sessions out of business routes.
- **Password changes are high-risk.** In-app changes require the current password,
  and both change and reset sign out every device.
- **Normal logout stays local.** It ends the current browser session without
  disturbing other devices.
- **One code-entry pattern covers both flows.** Email verification and password
  reset share the 6-digit input, resend cooldown, and error handling.
- **Reset copy avoids confirming registration.** The email step says a code was
  sent "if an account exists" instead of asserting that the email is registered.

## Cross-references

- [owner-profile.md](owner-profile.md) — owner contact details and the Profile
  page that hosts the Security section.
- [business.md](business.md) — the business and owner membership created after
  onboarding.
- [members.md](members.md) — the owner's membership and role in a business.
- [error-handling.md](error-handling.md) — the structured error envelope.
- [../architecture.md](../architecture.md) — the overall system design.
- [../schema.md](../schema.md) — the `Owner` and `AccountIdentity` entities.
