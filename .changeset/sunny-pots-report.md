---
'web': minor
---

Add the batch and product inventory detail pages

- Added the product inventory detail page: stock by purchase unit, an expiry
  warning, and the purchase history grouped by batch, each batch linking to its
  record.
- Added the batch detail page.
- The product list shows the lots and quantity expiring by the API's cutoff
  (a seven-day window).
- Kept a navigation trail so Back returns to the page the user came from across
  multi-hop routes, instead of a single hard-coded hop.
