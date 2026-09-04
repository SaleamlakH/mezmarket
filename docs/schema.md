# Data Schema

## Inventory & Sales Management App for Small/Medium Businesses

Conventions: `PK` = primary key (ULID — sortable by creation time), `FK` = foreign key, `UQ` = unique constraint. All tables include `id`, `createdAt`, `updatedAt` unless noted.

**Design notes, up front:**

- **Units live in a single `ProductUnit` table per product** — every transactable unit a product has (its Base Unit, its MOU, any explicitly-added same-dimension Standard Unit, any custom label like `shot`) is one row. This avoids needing three separate tables and a three-way polymorphic reference. Tables that transact in a unit (`StockBatchLine`, `SaleLine`, `Loss`) snapshot the unit's label and the resulting quantity directly as plain fields at the moment of the transaction, and keep an optional `productUnitId` link back to `ProductUnit` purely for traceability — never relied on to display historical facts, since a unit's name or factor can be edited later without rewriting past records.
- **`BusinessMember` is the single actor reference** for every action-recording table (`StockBatch`, `Container`, `Sale`, `Loss`, `Payment`, `AuditLog`). An Owner gets one `BusinessMember` row per Business they own (`role = OWNER`, created automatically when the Business is created, role locked thereafter), so an Owner acting on their own business and a regular team member resolve through the exact same field — and that reference is inherently scoped to the correct Business.
- **FIFO cost tracing**: `StockBatchLine.quantityRemaining` tracks stock per purchase lot, and `SaleLineCost` links each sale line to the specific lot(s) it drew from, bu the cost will be snapshot in SaleLineCost
- **Branch exists but is minimized**: every Business gets one auto-created `main` Branch at signup; every branch-scoped table carries `branchId`, but there is no multi-branch UI or switching in this version of the product — only one Branch per Business is ever created.
- **Roles are a fixed enum** (`manager`, `cashier`, `server`) — no dynamic role/permission configuration.
- **Nullable-FK-plus-application-layer-validation**, not database CHECK constraints, is the pattern used wherever a row's fields depend on its own type (`BusinessMember.ownerId` only being set when `role = OWNER`, `ProductUnit`'s role/standardUnitId pairing). Prisma's schema DSL has no native way to express a conditional CHECK constraint; the validation lives in the service layer instead, consistent with how every other business rule in this system is enforced.

---

## Table of Contents

1. [Identity & Tenancy](#1-identity--tenancy)
2. [Units](#2-units)
3. [Catalog](#3-catalog)
4. [Inventory Intake](#4-inventory-intake)
5. [Open Containers](#5-open-containers)
6. [Sales](#6-sales)
7. [Audit](#7-audit)
8. [Key Relationships Summary](#8-key-relationships-summary)
9. [Open Implementation Notes](#9-open-implementation-notes)

---

## 1. Identity & Tenancy

### `Owner`

A person, not scoped to any single business — one Owner can own multiple Businesses.
| Field | Type | Notes |
|---|---|---|
| id | String (PK, ulid) | |
| name | String | |
| contactEmail | String? | optional, business-contact purposes only — not the login credential |
| contactPhone | String? | optional |

Relations: `businesses` (Business[]), `accountIdentity` (AccountIdentity?, 1:1), `businessMemberships` (BusinessMember[] — one per Business owned, each with `role = OWNER`).

### `AccountIdentity`

The only place an auth-provider identifier is stored.
| Field | Type | Notes |
|---|---|---|
| id | String (PK, ulid) | |
| ownerId | String (FK → Owner, unique) | |
| providerUserId | String (unique) | the auth provider's own user id |

### `Business`

| Field                    | Type                          | Notes                                   |
| ------------------------ | ----------------------------- | --------------------------------------- |
| id                       | String (PK, ulid)             |                                         |
| ownerId                  | String (FK → Owner)           | single Owner per business               |
| name                     | String                        |                                         |
| currencyCode             | String                        | single currency per business (ISO 4217) |
| defaultTaxRate           | Decimal?                      | nullable = no tax                       |
| taxDisplayMode           | enum(`exclusive`,`inclusive`) | default `exclusive`                     |
| allowNegativeStock       | Boolean                       | default `true`                          |
| lowStockDefaultThreshold | Decimal?                      | optional global fallback                |

### `Branch`

| Field      | Type                   | Notes                                                           |
| ---------- | ---------------------- | --------------------------------------------------------------- |
| id         | String (PK, ulid)      |                                                                 |
| businessId | String (FK → Business) |                                                                 |
| name       | String                 | default `"main"` — one created automatically at Business signup |
| address    | String?                |                                                                 |

### `BusinessMember`

every person who can act within a Business, including the Owner.

| Field      | Type                                       | Notes                                                                                                                                                                                        |
| ---------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id         | String (PK, ulid)                          |                                                                                                                                                                                              |
| businessId | String (FK → Business)                     |                                                                                                                                                                                              |
| branchId   | String (FK → Branch)                       | defaults to the business's `main` branch                                                                                                                                                     |
| ownerId    | String? (FK → Owner, nullable)             | set **only** when `role = OWNER`; null for every other role                                                                                                                                  |
| name       | String                                     |                                                                                                                                                                                              |
| role       | enum(`owner`,`manager`,`cashier`,`server`) | drives permission level. A `role = owner` row is created automatically the moment its Business is created, and its role can never be changed thereafter — enforced at the application layer. |
| active     | Boolean                                    |                                                                                                                                                                                              |

## 2. Units

### `Dimension`

Platform-level.
| Field | Type | Notes |
|---|---|---|
| id | String (PK, ulid) | |
| name | String (UQ) | `Volume`, `Weight`, `Length`, `Count`, … |

### `DimensionReference`

A small join table designating, per Dimension, which Standard Unit every other unit in that dimension is ratio'd against — kept as a separate table (rather than a column on `Dimension` pointing at `StandardUnit`) so there's never a moment where a Dimension exists without a valid reference, or a circular not-null constraint to work around.
| Field | Type | Notes |
|---|---|---|
| dimensionId | String (FK → Dimension, unique) | one reference per dimension |
| standardUnitId | String (FK → StandardUnit) | |

### `StandardUnit`

Platform-level, managed by App Admin.
| Field | Type | Notes |
|---|---|---|
| id | String (PK, ulid) | |
| dimensionId | String (FK → Dimension) | |
| name | String | `Milliliter`, `Liter`, `Piece`, `Kilogram`, … |
| symbol | String | `ml`, `L`, `pc`, `kg` |
| ratioToReferenceUnit | Decimal | how many of this unit equal one of the dimension's reference unit |

### `ProductUnit`

Every transactable unit a product has — its Base Unit, its MOU, any explicitly-added same-dimension Standard Unit, and any custom label — is one row here.
| Field | Type | Notes |
|---|---|---|
| id | String (PK, ulid) | |
| productId | String (FK → Product) | |
| unitRole | enum(`BASE`,`MOU`,`STANDARD`,`CUSTOM`) | `BASE`/`MOU`/`STANDARD` always carry a `standardUnitId`; `CUSTOM` never does |
| standardUnitId | String? (FK → StandardUnit, nullable) | non-null for `BASE`/`MOU`/`STANDARD`; null for `CUSTOM` |
| name | String | display name — defaults from the linked Standard Unit when present, always overridable |
| dependsOn | enum(`BASE`,`MOU`)? | null only for the `BASE` row itself |
| conversionRate | Decimal? | relative to whichever unit `dependsOn` points at. For a `STANDARD` row, computed automatically from both units' `ratioToReferenceUnit` in the shared dimension (adding `L` when Base is `ml` computes `1000` without manual entry). For a `CUSTOM` row, entered manually, since nothing in the system knows what a `shot` is worth on its own. Null for the `BASE` row itself. |
| price | Decimal? | selling price for this unit |
| purchaseCapable | Boolean | |
| sellCapable | Boolean | |

Using a Standard Unit on a specific product — even one sharing a Dimension with the product's Base Unit, like adding `L` next to a `ml` Base — is an explicit action that creates a `STANDARD`-role row. The _conversion math_ for that row is automatic (derived from platform-level facts); the _decision to add it_ is not.

Different physical package sizes of what might look like "the same product" (a 5 L bottle vs. a 10 L bottle of the same oil) are separate `Product` rows, each with its own `ProductUnit` set — never one product with two conflicting Base-to-MOU relationships.

---

## 3. Catalog

### `Product`

| Field              | Type                              | Notes                                                                       |
| ------------------ | --------------------------------- | --------------------------------------------------------------------------- |
| id                 | String (PK, ulid)                 |                                                                             |
| businessId         | String (FK → Business)            |                                                                             |
| branchId           | String (FK → Branch)              |                                                                             |
| categoryId         | String? (FK → Category, nullable) |                                                                             |
| name               | String                            |                                                                             |
| brand              | String?                           |                                                                             |
| description        | String?                           |                                                                             |
| photoUrl           | String?                           |                                                                             |
| trackAsPartial     | Boolean                           | requires an MOU and a qualifying sell-capable unit smaller than 1 Base Unit |
| lowStockThreshold  | Decimal?                          | in Base Unit terms                                                          |
| currentSealedStock | Decimal                           | derived value, see §9                                                       |
| active             | Boolean                           |                                                                             |

No `sku`, no `cost_price` — neither is stored: SKU has no current feature depending on it, and cost is recorded per `StockBatchLine` at time of purchase (and varies purchase to purchase), so margin is derived from that history rather than a static field.

### `Category`

| Field       | Type                   | Notes |
| ----------- | ---------------------- | ----- |
| id          | String (PK, ulid)      |       |
| businessId  | String (FK → Business) |       |
| name        | String                 |       |
| description | String?                |       |

---

## 4. Inventory Intake

### `StockBatch`

| Field              | Type                                    | Notes                                                                                       |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| id                 | String (PK, ulid)                       |                                                                                             |
| businessId         | String (FK → Business)                  |                                                                                             |
| branchId           | String (FK → Branch)                    |                                                                                             |
| supplierName       | String?                                 |                                                                                             |
| referenceNumber    | String?                                 |                                                                                             |
| batchDate          | DateTime                                |                                                                                             |
| confirmedAt        | DateTime?                               | null = draft (freely editable); non-null = confirmed and locked for ledger-affecting fields |
| receivedByMemberId | String? (FK → BusinessMember, nullable) |                                                                                             |

Once `confirmedAt` is set, each line's `purchaseUnit`, `purchaseQuantity`, `purchaseUnitCost`, `standardUnit`, `standardQuantity`, and `product` are locked against normal editing — with one deliberate exception: Owner/Manager can perform a direct override edit on a specific, known-wrong line, providing a required reason, captured in `AuditLog` as the field, its old value, and its new value. This is a rare, audited action, not a routine editing path. `supplierName`, `referenceNumber`, and each line's `expiryDate` remain freely editable regardless of confirmation status.

### `StockBatchLine`

| Field                  | Type                                                       | Notes                                                                                                                                                                                                                                                                                                      |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                     | String (PK, ulid)                                          |                                                                                                                                                                                                                                                                                                            |
| stockBatchId           | String (FK → StockBatch)                                   |                                                                                                                                                                                                                                                                                                            |
| productId              | String (FK → Product)                                      | locked once confirmed                                                                                                                                                                                                                                                                                      |
| purchaseUnit           | String                                                     | **snapshot** — the unit's display name/label as it was at the moment of purchase, e.g. `"Case"`                                                                                                                                                                                                            |
| purchaseQuantity       | Decimal                                                    | **snapshot** — quantity as entered, in `purchaseUnit` terms; locked once confirmed                                                                                                                                                                                                                         |
| purchaseUnitCost       | Decimal                                                    | **snapshot** — locked once confirmed                                                                                                                                                                                                                                                                       |
| standardUnit           | String                                                     | **snapshot** — the resolved Standard Unit's label at time of purchase, e.g. `"ml"`                                                                                                                                                                                                                         |
| standardQuantity       | Decimal                                                    | **snapshot** — the purchase normalized into `standardUnit` terms; this is what feeds `Product.currentSealedStock`                                                                                                                                                                                          |
| resolvedStandardUnitId | String? (FK → StandardUnit, nullable, `onDelete: SetNull`) | **traceability only** — live link to the actual Standard Unit this line resolved to, for drilling down (e.g. seeing all lines that resolved to a given unit, or cross-referencing that unit's current definition). Paired with `standardUnit` the same way `productUnitId` is paired with `purchaseUnit`.  |
| productUnitId          | String? (FK → ProductUnit, nullable, `onDelete: SetNull`)  | **traceability only** — a live link back to the current unit configuration, useful for drilling into "what is this unit today," but never relied on to display historical facts. If the linked `ProductUnit` is later renamed or its factor changed, this line's own snapshot fields above are unaffected. |
| quantityRemaining      | Decimal                                                    | **derived value** (see §9) — `standardQuantity − SUM(SaleLineCost.quantityPulled where stockBatchLineId = this line) − SUM(Loss.standardQuantity where stockBatchLineId = this line)`. Cached for fast lookups like every other derived total in this schema, recomputable if it ever drifts.              |
| expiryDate             | DateTime?                                                  | editable regardless of confirmation status                                                                                                                                                                                                                                                                 |

Whether purchases should be restricted to Base-Unit-dimension units only (excluding MOU-based units like `shot`, since inventory intake represents sealed packages arriving) is an open question, not yet resolved.

### `Loss`

Damage or expiry discovered outside the normal sale flow — always tied to a real purchase lot, never estimated. Stock-take-driven surplus/shortage (no known cause) is deliberately out of scope; see §9.
| Field | Type | Notes |
|---|---|---|
| id | String (PK, ulid) | |
| productId | String (FK → Product) | |
| stockBatchLineId | String (FK → StockBatchLine) | **required** — the system suggests a default (the oldest lot of this product with remaining stock), the actor can select a different one if the specific lot is known to differ. Because this is always a real, locked purchase record, cost is read live from `StockBatchLine.purchaseUnitCost` — there is no separate cost/value field on `Loss` itself, and no need to estimate anything. |
| unit | String | **snapshot** — the as-entered unit label, matching how the loss was actually discovered/counted |
| quantity | Decimal | **snapshot** — in `unit` terms |
| standardUnit | String | **snapshot** — the resolved Standard Unit's label |
| standardQuantity | Decimal | **snapshot** — normalized into `standardUnit` terms; this is what actually feeds the ledger math (decrements `Product.currentSealedStock` and the linked `StockBatchLine.quantityRemaining`) |
| productUnitId | String? (FK → ProductUnit, nullable, `onDelete: SetNull`) | traceability only, same pattern as `StockBatchLine` |
| resolvedStandardUnitId | String? (FK → StandardUnit, nullable, `onDelete: SetNull`) | traceability only, same pattern as `StockBatchLine` |
| reason | enum(`DAMAGE`,`EXPIRED`,`OTHER`) | a fixed category, not free text, so losses are reliably reportable/filterable regardless of who recorded them |
| reasonDetail | String? | optional free text alongside the category |
| businessMemberId | String (FK → BusinessMember) | restricted to Owner/Manager |
| createdAt | DateTime | |

No total-value field is stored — a Loss's value is `standardQuantity × StockBatchLine.purchaseUnitCost`, computed whenever needed rather than stored redundantly, same reasoning as dropping `SaleLine.lineSubtotal`.

---

## 5. Open Containers

### `Container`

| Field            | Type                         | Notes                                                                                                                      |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| id               | String (PK, ulid)            |                                                                                                                            |
| productId        | String (FK → Product)        | must have an MOU                                                                                                           |
| branchId         | String (FK → Branch)         |                                                                                                                            |
| stockBatchLineId | String (FK → StockBatchLine) | ties a container to the specific purchase lot it was opened from, so partial-container sales get accurate FIFO costing too |
| status           | enum(`OPEN`,`CLOSED`)        | never auto-closes                                                                                                          |
| initialMouQty    | Decimal                      | set when opened                                                                                                            |
| remainingMouQty  | Decimal                      | derived value, see §9                                                                                                      |
| openedByMemberId | String (FK → BusinessMember) |                                                                                                                            |
| openedAt         | DateTime                     |                                                                                                                            |

| closedByMemberId | String? (FK → BusinessMember, nullable) | |

| deviation | Decimal? | computed automatically at close, not entered manually — `initialMouQty − SUM(sale quantities recorded against this container)` at the moment of close. Positive = physical loss never recorded as a sale (over-pouring/spillage/theft). Negative = an allowed oversell (under-pouring beyond what the container should have held). Null until closed. |
| closeReason | String? | optional, never required |

Multiple containers of the same product can be open simultaneously. Closing is always a manual action, never automatic even at zero remaining — closing itself is what signals nothing further will be sold from it.

---

## 6. Sales

### `Customer`

| Field        | Type                   | Notes |
| ------------ | ---------------------- | ----- |
| id           | String (PK, ulid)      |       |
| businessId   | String (FK → Business) |       |
| name         | String                 |       |
| contactPhone | String?                |       |
| contactEmail | String?                |       |
| active       | Boolean                |       |

No login — exists so a Pending/Partially-Paid sale can answer "who owes this."

### `Sale`

| Field                        | Type                                    | Notes                                                                                                                                                                          |
| ---------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id                           | String (PK, ulid)                       |                                                                                                                                                                                |
| businessId                   | String (FK → Business)                  |                                                                                                                                                                                |
| branchId                     | String (FK → Branch)                    |                                                                                                                                                                                |
| invoiceNumber                | String (UQ per branch)                  |                                                                                                                                                                                |
| processedByMemberId          | String (FK → BusinessMember)            | who processed it, captured automatically                                                                                                                                       |
| serverMemberId               | String? (FK → BusinessMember, nullable) | Server attribution only, whole-sale-level — a waiter who took the order but didn't process the sale; distinct from `processedByBusinessMemberId`; always a `role = server` row |
| customerId                   | String? (FK → Customer, nullable)       |                                                                                                                                                                                |
| saleDatetime                 | DateTime                                |                                                                                                                                                                                |
| discount                     | Decimal?                                |                                                                                                                                                                                |
| taxRateApplied               | Decimal                                 | snapshot of business rate at time of sale                                                                                                                                      |
| subtotal / taxAmount / total | Decimal                                 |                                                                                                                                                                                |
| paymentStatus                | enum(`PAID`,`PENDING`,`PARTIALLY_PAID`) |                                                                                                                                                                                |
| amountPaid                   | Decimal                                 | derived value — `SUM(Payment.amount)` for this sale, see §9                                                                                                                    |
| balanceDue                   | Decimal                                 | derived — `total − amountPaid`                                                                                                                                                 |
| voidStatus                   | enum(`NONE`,`VOIDED`)                   | Void (shouldn't have happened, full reversal) is kept distinct from Refund (happened, goods returned, per-line restock choice)                                                 |
| voidReason                   | String?                                 |                                                                                                                                                                                |

### `SaleLine`

| Field                  | Type                                                       | Notes                                                                                                                                                                                                                                      |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id                     | String (PK, ulid)                                          |                                                                                                                                                                                                                                            |
| saleId                 | String (FK → Sale)                                         |                                                                                                                                                                                                                                            |
| productId              | String (FK → Product)                                      |                                                                                                                                                                                                                                            |
| soldUnit               | String                                                     | **snapshot** — the unit's display label as sold, e.g. `"Shot"`                                                                                                                                                                             |
| quantity               | Decimal                                                    | as entered, in `soldUnit` terms                                                                                                                                                                                                            |
| standardUnit           | String                                                     | **snapshot** — the resolved Standard Unit's label at time of sale, e.g. `"ml"`. Not always the Base Unit's standard unit — an MOU-based custom unit (`shot`) resolves to the MOU's standard unit, since that's what a container tracks in. |
| quantityInStandardUnit | Decimal                                                    | **snapshot** — the quantity in `standardUnit` terms, frozen at time of sale — never recomputed from a `ProductUnit`'s current `conversionRate` if it's edited later                                                                        |
| productUnitId          | String? (FK → ProductUnit, nullable, `onDelete: SetNull`)  | traceability only, same pattern as `StockBatchLine`                                                                                                                                                                                        |
| resolvedStandardUnitId | String? (FK → StandardUnit, nullable, `onDelete: SetNull`) | traceability only, paired with `standardUnit` above                                                                                                                                                                                        |
| unitPrice              | Decimal                                                    | **snapshot** from `ProductUnit.price` at time of sale                                                                                                                                                                                      |
| containerId            | String? (FK → Container, nullable)                         | set only for partial sales, targeting one selected container                                                                                                                                                                               |
| refunded               | Boolean                                                    |                                                                                                                                                                                                                                            |
| refundRestocked        | Boolean                                                    | reflects the product's default, overridable per line                                                                                                                                                                                       |

No stored `lineSubtotal` — it's `quantity × unitPrice`, fully derivable from two fields already on this same row with no independent information of its own, so it's computed at query/render time rather than stored, same as every other derived value in this schema.

### `SaleLineCost`

Links a sale line to the specific purchase lot(s) it drew from — kept as a genuine record of a real allocation decision, not a derived rollup, since a single sale line can legitimately be split across more than one lot if the earliest lot ran out mid-line (FIFO-selected automatically; a sale line is never split by cashier choice, consistent with how a Container sale always targets exactly one container rather than auto-splitting).
| Field | Type | Notes |
|---|---|---|
| id | String (PK, ulid) | |
| saleLineId | String (FK → SaleLine) | |
| stockBatchLineId | String (FK → StockBatchLine) | |
| quantityPulled | Decimal | in standard-unit terms, from this specific lot — this is what `StockBatchLine.quantityRemaining` is derived from |
| unitCost | Decimal | **snapshot** — `StockBatchLine.purchaseUnitCost` at the exact moment this pull happened. This protects completed sales from later corrections: if that batch line's cost is subsequently fixed via a direct override edit, a sale's already-reported margin must not silently change. |

### `Payment`

| Field            | Type                                                       | Notes                                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | String (PK, ulid)                                          |                                                                                                                                                                              |
| saleId           | String (FK → Sale)                                         |                                                                                                                                                                              |
| amount           | Decimal                                                    |                                                                                                                                                                              |
| paidAt           | DateTime                                                   |                                                                                                                                                                              |
| businessMemberId | String (FK → BusinessMember)                               | who recorded it                                                                                                                                                              |
| method           | enum(`CASH`,`CARD`,`BANK_TRANSFER`,`MOBILE_MONEY`,`OTHER`) |                                                                                                                                                                              |
| methodDetail     | String?                                                    | free-text, for the `OTHER` case or extra specificity (e.g. which mobile money provider) — keeps the enum from being a dead end given how much payment methods vary by region |

---

## 7. Audit

### `AuditLog`

Append-only. Written explicitly by the application's service layer, in the same transaction as the action itself.
| Field | Type | Notes |
|---|---|---|
| id | String (PK, ulid) | |
| businessId | String (FK → Business) | denormalized so "this business's audit log" needs no per-entity-type join |
| entityType | enum(`STOCK_BATCH`,`SALE`,`CONTAINER`,`INVENTORY_ADJUSTMENT`,`STAFF`,`BUSINESS`,`PRODUCT`,…) | |
| entityId | String | |
| action | enum(`CREATED`,`CONFIRMED`,`VOIDED`,`CLOSED`,`REFUNDED`,`ADJUSTED`,`UPDATED`,`DEACTIVATED`,…) | |
| businessMemberId | String (FK → BusinessMember) | |
| occurredAt | DateTime | |
| metadata | Json | free-form details not captured by fixed columns |

---

## 8. Key Relationships Summary

```
Owner ──< Business ──< Branch ──< BusinessMember
                    └──< Category
                    └──< Customer
                    └──< Product ──< ProductUnit
                    └──< StockBatch ──< StockBatchLine
                    └──< Sale ──< SaleLine ──< SaleLineCost >── StockBatchLine
                                └──< Payment

Owner ──< BusinessMember (one per Business owned, role = owner)
Business ──< BusinessMember (includes the owner + every regular team member)
   BusinessMember is referenced by: StockBatch.receivedByBusinessMemberId, Container.openedByMemberId/closedByMemberId, Sale.processedByMemberId,
   Sale.serverMemberId (attribution only), Loss.businessMemberId, Payment.businessMemberId,
   AuditLog.businessMemberId

Dimension ──< StandardUnit
Dimension ─── DimensionReference ──> StandardUnit

Product ──< StockBatchLine
Product ──< Container ─── StockBatchLine
Product ──< Loss ─── StockBatchLine (required — always tied to a real purchase lot)
Product ──< SaleLine

Sale ─── Customer (nullable)
Sale ─── Staff (nullable, attribution only — not the acting actor)
```
