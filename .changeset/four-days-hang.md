---
'web': patch
---

Redirect authenticated users to the dashboard

- Successful login, signup, and email verification now land on
  the dashboard instead of the home page. They able to access the
  the home page by explicit `/home` path
- Authenticated users visiting `/` are now sent to the dashboard.
