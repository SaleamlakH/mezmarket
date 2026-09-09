---
'@mez/validation': minor
'@mez/types': minor
'api': minor
'web': minor
---

Implement business creation feature

- **api**: Added a business module with authenticated list/create endpoints
- **@mez/types**: Added shared business request(inputs) and response types
- **@mez/validation**: Added business creation validation schema and parser.
- **web**: Add a business creation flow with a validated form, and a business \
  fetcher layout which will gate to the dashboard or to the business creation.
