---
'api': patch
---

Fix sale lot draws and report blocked sale lines

- Draw each sale line from the oldest lot that can cover the whole line, so a
  fractional remnant is left for a smaller sale instead of being consumed in
  pieces. Split across lots only when no single lot can cover the line.
- Report all blocked stock draws and unusable units in one response, keyed by
  the line's `productId` or `productUnitId` field path, naming the unit where
  the server can resolve it.
