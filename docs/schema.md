# Data Schema

## Inventory & Sales Management App for Small/Medium Businesses

Conventions: `PK` = primary key, `FK` = foreign key, `UQ` = unique constraint. All tables include `id` (UUID), `created_at`, `updated_at` unless noted.

**Polymorphic references, resolved:** anywhere this schema needs "one of several possible types," it uses **multiple nullable FK columns with a CHECK constraint enforcing exactly one non-null**. This applies to unit references (product_mou / standard_unit / custom_unit) and to actor references (owner / staff), and matches the Architecture doc's decision that Prisma doesn't model true polymorphism cleanly.

---

## Table of Contents

- [Identity & tenancy](#1-identity--tenancy)
  - [owners](#owners)
  - [businesses](#businesses)
  - [staff](#staff)
  - [account_identities](#account_identities)
- [Units](#2-units)
  - [dimensions](#dimensions)
  - [standard_units](#standard_units)
  - [product_mous (Base unit + measurement/content-units)](#product_mous-base-unit--measurementcontent-units)
  - [cutom_units](#custom_units)
  - [unit_sale_prices](#unit_sale_prices)
- [Products](#3-products)
  - [products](#products)
- [Inventory intake](#4-inventory-intake)
  - [batches](#batches)
  - [batch_lines](#batch_lines)
  - [inventory_adjustments](#inventory_adjustments)
- [Open Containers](#5-open-containers)
  - [containers](#containers)
- [Sales](#6-sales)
  - [sales](#sales)
  - [customers](#customers)
  - [sale_lines](#sale_lines)
  - [payments](#payments)
- [Audit](#7-audit)
  - [audit_log](#audit_log)
- [Key Relationships summary](#8-key-relationships-summary)
- [Open implementation notes](#9-open-implementation-notes)

---

## 1. Identity & Tenancy

### `owners`

An Owner is a person, not scoped to any single business — **one Owner can own multiple Businesses.**
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | text | |
| contact_email | text | optional, business-contact purposes only — **not** the login credential, which lives entirely with the auth provider via `account_identities` |
| contact_phone | text | optional |

### `businesses`

| Field                       | Type                          | Notes                                   |
| --------------------------- | ----------------------------- | --------------------------------------- |
| id                          | UUID (PK)                     |                                         |
| owner_id                    | UUID (FK → owners)            | **single Owner per business**           |
| name                        | text                          |                                         |
| currency_code               | text                          | single currency per business (ISO 4217) |
| default_tax_rate            | decimal                       | nullable = no tax                       |
| tax_display_mode            | enum(`exclusive`,`inclusive`) | default `exclusive`                     |
| allow_negative_stock        | boolean                       | default `true`, business-level toggle   |
| low_stock_default_threshold | decimal                       | optional global fallback                |

### `staff`

Unified table for **all** working people below the Owner — Manager, Cashier, and (what used to be a separate `servers` table) Server/waiter. The `servers` table is eliminated; a Server is just `staff` with `role = 'server'`.
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| business_id | UUID (FK → businesses) | one Staff row is scoped to exactly one business — the same real person working at two businesses gets two separate `staff` rows (and, if they log in, two separate `account_identities` entries) |
| name | text | |
| role | enum(`manager`,`cashier`,`server`) | drives permission level; unrelated to whether the row has login credentials (see below) |
| contact_email | text | optional; used as the login email if credentials are created, but not required to exist on its own |
| active | boolean | soft-deactivate; historical records referencing this staff member keep their name |

> **Login is optional per staff row, not tied to role.** In practice, Manager/Cashier need credentials to use the app and a Server typically doesn't — but the schema doesn't hard-enforce that coupling. Whether a `staff` row can log in is determined purely by whether an `account_identities` row exists for it, not by `role`.

### `account_identities`

The **only** place any auth-provider identifier is stored. Nothing else in the schema ever stores a Supabase (or any provider's) user id directly — everything else references `owner_id`/`staff_id`. If the auth provider changes, or a provider-side id changes, exactly one row here changes; nothing else in the system is affected.
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| provider | text | e.g. `supabase` |
| provider_user_id | text | the auth provider's own user id |
| owner_id | UUID (FK → owners, nullable) | exactly one of `owner_id` / `staff_id` is non-null |
| staff_id | UUID (FK → staff, nullable) | |
| UQ | (provider, provider_user_id) | |
| CHECK | exactly one of (owner_id, staff_id) is non-null | |

> **Provisioning, not self-service:** there is no public signup flow for `staff`. An Owner/Manager creates a `staff` row and, if that role needs app access, creates its credentials directly (via the auth provider's admin API) and hands them over — no invite-link/email-confirmation flow. The **Owner** is the only identity created through a public signup, and that signup simultaneously creates their first `businesses` row.

### Actor reference pattern (used throughout this schema)

Any table needing to record "who did this" uses the same pair, never a single generic `actor_id`:

```
actor_owner_id   UUID (FK → owners, nullable)
actor_staff_id   UUID (FK → staff, nullable)
CHECK: exactly one of the two is non-null
```

An Owner can personally act within one of their own businesses (e.g. process a sale themselves), which is why both columns exist on action-recording tables rather than assuming only `staff` ever acts.

---

## 2. Units

### `dimensions`

Platform-level, not tenant-scoped.
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | text (UQ) | `Volume`, `Weight`, `Length`, `Count`, … |
| reference_unit_id | UUID (FK → standard_units, nullable) | the one unit in this dimension every other unit's ratio is expressed against (e.g. `ml` for Volume). Nullable only because of the creation-order chicken-and-egg (dimension needs a unit to exist first) — must be set before the dimension is usable. |

### `standard_units`

Platform-level, managed by App Admin.
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| dimension*id | UUID (FK → dimensions) | |
| name | text | `Milliliter`, `Liter`, `Piece`, `Kilogram`, … |
| symbol | text | `ml`, `L`, `pc`, `kg` |
| ratio_to_reference_unit | decimal | how many of \_this* unit equal one of the dimension's reference unit (reference unit itself stores `1`). E.g. if `ml` is Volume's reference, `L` stores `1000`. Any two same-dimension units convert by going through this shared anchor — no pairwise conversion table needed, and no risk of two independently-entered ratios disagreeing with each other. |

> **Naming note:** "reference unit" here is a platform-level, per-Dimension concept, unrelated to a product's **Base Unit (BU)** below — the word "base" is deliberately not reused here to avoid the confusion that came up while designing this.

### `product_mous` (Base Unit + Measurement/Content Units)

Every product has exactly one row with `unit_role = 'base'`; zero or more rows with `unit_role = 'mou'` (v1 UI: max one MOU row per product).
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| product_id | UUID (FK → products) | |
| standard_unit_id | UUID (FK → standard_units) | |
| unit_role | enum(`base`,`mou`) | |
| pack_relation_qty | decimal | only set when `unit_role = 'mou'`: `1 × base_unit = pack_relation_qty × this MOU` (e.g. 350 for `1 pc = 350 ml`). Null for the base row. No cross-MOU ratios are computed or stored. |

### `custom_units`

Based on BU or an MOU. Reserved for units that **aren't already Standard Units** — a Standard Unit sharing a Dimension with a product's BU/MOU is automatically available for that product with no Custom Unit needed at all.
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| product_id | UUID (FK → products) | |
| name | text | `shot`, `slice`, `bottle`, `case`, `cup` |
| based_on_mou_id | UUID (FK → product_mous) | which BU/MOU row this derives from |
| factor | decimal | `1 Custom Unit = factor × based_on unit` (fractional for slice/shot, 1:1 for pure relabeling like `bottle`) |
| purchase_capable | boolean | |
| sell_capable | boolean | |

### `unit_sale_prices`

**Selling price only** — never purchase price. Purchase cost isn't a pre-set price at all; it's whatever was actually paid, recorded per `batch_lines.unit_cost`, and legitimately varies batch to batch. (Renamed from `unit_prices` — the old name and its `purchase_capable`/`sell_capable` flags implied it covered purchasing too, which was wrong.)
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| product_id | UUID (FK → products) | required even though it's derivable from `product_mou_id`/`custom_unit_id` in two of the three cases — a `standard_unit_id` row has no product of its own (Standard Units are platform-level), so this is the only way to know which product's price it is in that case. Kept on all rows for a uniform, simple table shape rather than a conditional one. |
| product_mou_id | UUID (FK → product_mous, nullable) | exactly one of these three is non-null |
| standard_unit_id | UUID (FK → standard_units, nullable) | |
| custom_unit_id | UUID (FK → custom_units, nullable) | |
| price | decimal | |
| CHECK | exactly one of (product_mou_id, standard_unit_id, custom_unit_id) is non-null | |

---

## 3. Products

### `products`

| Field                | Type      | Notes                                                               |
| -------------------- | --------- | ------------------------------------------------------------------- |
| id                   | UUID (PK) |                                                                     |
| name                 | text      |                                                                     |
| category             | text      |                                                                     |
| description          | text      |                                                                     |
| image_url            | text      |                                                                     |
| track_as_partial     | boolean   | must have an MOU + a qualifying sell-capable unit smaller than 1 BU |
| low_stock_threshold  | decimal   | in BU terms                                                         |
| current_sealed_stock | decimal   | BU count — **derived value**, see §9                                |
| active               | boolean   |                                                                     |

No `sku` and no `cost_price` field — both dropped (SKU: no current feature needs it; cost: recorded per Batch Line and legitimately varies, so a static per-product field would only drift out of date — margin is derived from Batch Line cost history instead).

---

## 4. Inventory Intake

### `batches`

| Field                           | Type      | Notes                                                                                                                                                                               |
| ------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                              | UUID (PK) |                                                                                                                                                                                     |
| supplier_name                   | text      | optional                                                                                                                                                                            |
| reference_number                | text      | optional                                                                                                                                                                            |
| batch_date                      | date      |                                                                                                                                                                                     |
| confirmed_at                    | timestamp | null = draft (freely editable); non-null = confirmed. Confirmation is immediate lock for ledger-affecting fields (see below) — not conditional on whether anything's been sold yet. |
| actor_owner_id / actor_staff_id | —         | who created it, per the actor pattern in §1                                                                                                                                         |

> **Field-level immutability after confirmation:** `quantity`, `unit`, `unit_cost`, and `product` on each line are never editable once `confirmed_at` is set — corrections go through an Inventory Adjustment (§4). Purely descriptive fields — `supplier_name`, `reference_number`, and each line's `expiry_date` — remain editable regardless of confirmation status.

### `batch_lines`

| Field                                              | Type                 | Notes                                                                                                                     |
| -------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| id                                                 | UUID (PK)            |                                                                                                                           |
| batch_id                                           | UUID (FK → batches)  |                                                                                                                           |
| product_id                                         | UUID (FK → products) | locked once the batch is confirmed                                                                                        |
| product_mou_id / standard_unit_id / custom_unit_id | —                    | exactly one non-null, per the unit-reference pattern above; the unit the purchase was recorded in. Locked once confirmed. |
| quantity                                           | decimal              | in the unit recorded, as entered — locked once confirmed                                                                  |
| quantity_in_bu                                     | decimal              | computed at confirm time, added to `products.current_sealed_stock`                                                        |
| unit_cost                                          | decimal              | locked once confirmed                                                                                                     |
| expiry_date                                        | date                 | editable regardless of confirmation status                                                                                |

> **Open question, not yet resolved:** should `product_mou_id`/`standard_unit_id`/`custom_unit_id` on a Batch Line be restricted to BU-dimension units only (excluding MOU-based units like `shot`), since inventory intake represents sealed packages arriving, not partial/measured amounts? Flagged for a future decision, not enforced yet.

### `inventory_adjustments`

Corrections outside normal batch/sale flow.
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| product_id | UUID (FK → products) | |
| product_mou_id / standard_unit_id / custom_unit_id | — | exactly one non-null — the unit the correction is expressed in. Widened from an earlier base/MOU-only design so a correction can be made in whatever unit the original error was (e.g. `shot`), not just base/MOU terms. |
| quantity_delta | decimal | positive or negative, in the chosen unit |
| reason | text | required |
| related_batch_id | UUID (FK → batches, nullable) | |
| related_container_id | UUID (FK → containers, nullable) | |
| actor_owner_id / actor_staff_id | — | restricted to Owner/Manager |
| created_at | timestamp | |

---

## 5. Open Containers

### `containers`

Multiple simultaneous open containers per product allowed.
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| product_id | UUID (FK → products) | must have an MOU |
| status | enum(`open`,`closed`) | never auto-closes |
| initial_mou_qty | decimal | set when opened (1 BU converted → this many MOU) |
| remaining_mou_qty | decimal | decremented by targeted sale lines' snapshotted MOU quantity (§6) — derived value, see §9 |
| opened_actor_owner_id / opened_actor_staff_id | — | actor pattern |
| opened_at | timestamp | |
| closed_actor_owner_id / closed_actor_staff_id | — | actor pattern, nullable until closed |
| closed_at | timestamp | nullable |
| deviation | decimal | **computed automatically at close**, not entered manually: `initial_mou_qty − SUM(sale quantities recorded against this container)`, evaluated at the moment of close. Positive = ledger still expected some left (over-pouring/spillage/theft — physical loss never recorded as a sale). Negative = more was sold than the container should have held (an allowed oversell, per the warn-don't-block rule). There is no separate "actual remaining" input — closing itself is the signal that nothing further will be sold from it, and the deviation is just whatever the ledger still expected at that point. |
| close_reason | text | optional, never required (e.g. "spillage," "sample given," "suspected theft") |

---

## 6. Sales

### `sales`

| Field                           | Type                                    | Notes                                                                                                                                                                   |
| ------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                              | UUID (PK)                               |                                                                                                                                                                         |
| invoice_number                  | text (UQ per business)                  |                                                                                                                                                                         |
| actor_owner_id / actor_staff_id | —                                       | who processed it, captured automatically                                                                                                                                |
| staff_id                        | UUID (FK → staff, nullable)             | **attribution only** — the Server/waiter credited with the sale, distinct from the acting actor above. Only ever a `staff` row (a Server or otherwise), never an Owner. |
| customer_id                     | UUID (FK → customers, nullable)         | see new `customers` table below — needed to answer "who owes this" on Pending/Partially Paid sales                                                                      |
| sale_datetime                   | timestamp                               |                                                                                                                                                                         |
| discount                        | decimal                                 | nullable                                                                                                                                                                |
| tax_rate_applied                | decimal                                 | snapshot of business rate at time of sale                                                                                                                               |
| subtotal / tax_amount / total   | decimal                                 |                                                                                                                                                                         |
| payment_status                  | enum(`paid`,`pending`,`partially_paid`) |                                                                                                                                                                         |
| amount_paid                     | decimal                                 | **derived value** — `SUM(payments.amount)` for this sale, not independently trusted; see §9                                                                             |
| balance_due                     | decimal                                 | derived — `total − amount_paid`                                                                                                                                         |
| void_status                     | enum(`none`,`voided`)                   | see note below on void vs. refund                                                                                                                                       |
| void_reason                     | text                                    | nullable                                                                                                                                                                |

> **Void vs. Refund — kept as two distinct concepts, not one action:** **Void** means the sale shouldn't have existed at all (data-entry mistake, duplicate) — a full reversal of the whole transaction and all its stock effects, no per-line choices. **Refund** means the sale genuinely happened and goods are being returned afterward — partial or full, per-line, following each product's restock default with the per-line override already designed (`sale_lines.refunded`/`refund_restocked`). This distinction was left unresolved in an earlier discussion pass; recorded here as the working design, flag if you want to revisit it.

### `customers`

New table — a gap surfaced during this discussion. Needed so a Pending/Partially-Paid sale can answer "who owes this," which nothing in the schema could do before.
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| business_id | UUID (FK → businesses) | |
| name | text | |
| contact_phone / contact_email | text | optional |
| active | boolean | |

> No login, same non-login pattern as the old `servers` concept — purely a reference for attribution/collections, not an app user.

### `sale_lines`

| Field                                              | Type                             | Notes                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                                                 | UUID (PK)                        |                                                                                                                                                                                                                                                                                                                                                               |
| sale_id                                            | UUID (FK → sales)                |                                                                                                                                                                                                                                                                                                                                                               |
| product_id                                         | UUID (FK → products)             |                                                                                                                                                                                                                                                                                                                                                               |
| product_mou_id / standard_unit_id / custom_unit_id | —                                | exactly one non-null — the unit **as sold/displayed**, per the unit-reference pattern                                                                                                                                                                                                                                                                         |
| quantity                                           | decimal                          | in the unit sold, as entered                                                                                                                                                                                                                                                                                                                                  |
| resolved_standard_unit_id                          | UUID (FK → standard_units)       | **historical-integrity snapshot** — the Standard Unit this line's quantity resolves to at the moment of sale. Not always the BU: an MOU-based custom unit (e.g. `shot`) resolves to the **MOU's** standard unit (`ml`), since that's what a container's remaining is tracked in; a BU-based unit resolves to the BU's standard unit.                          |
| quantity_in_standard_unit                          | decimal                          | the quantity in `resolved_standard_unit_id`, frozen at time of sale. Custom Units are mutable configuration (a label + a factor the Owner can edit later); these two fields are the fixed historical fact and are never recomputed from a Custom Unit's _current_ factor. Container deduction always uses this snapshotted value, never a live re-derivation. |
| unit_price                                         | decimal                          | snapshot from `unit_sale_prices` at time of sale                                                                                                                                                                                                                                                                                                              |
| line_subtotal                                      | decimal                          |                                                                                                                                                                                                                                                                                                                                                               |
| container_id                                       | UUID (FK → containers, nullable) | set only for partial sales, targeting one selected container                                                                                                                                                                                                                                                                                                  |
| refunded                                           | boolean                          | only meaningful under the Refund path, not Void (which reverses the whole sale uniformly)                                                                                                                                                                                                                                                                     |
| refund_restocked                                   | boolean                          | reflects the product's default, overridable per line at refund time                                                                                                                                                                                                                                                                                           |

### `payments`

| Field                           | Type              | Notes                           |
| ------------------------------- | ----------------- | ------------------------------- |
| id                              | UUID (PK)         |                                 |
| sale_id                         | UUID (FK → sales) |                                 |
| amount                          | decimal           |                                 |
| paid_at                         | timestamp         |                                 |
| actor_owner_id / actor_staff_id | —                 | who recorded it                 |
| method                          | text              | optional (cash, transfer, etc.) |

---

## 7. Audit

### `audit_log`

Append-only. Written explicitly by the application's service layer, in the same transaction as the action itself — not a database trigger, and not automatic in the sense of "the platform notices and logs it independently."
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| business_id | UUID (FK → businesses) | **added** — without this, answering "show me this business's audit log" required drilling into whatever table `entity_type` pointed at just to find its business, a different join per entity type. Denormalized on purpose, populated at write time. |
| entity_type | enum(`batch`,`sale`,`container`,`inventory_adjustment`,`staff`,`business`,`product`,…) | **now a real enum**, not free text — was loose `text` before, risking typos with no query safety |
| entity_id | UUID | the id of whatever record the event happened to (a specific `batches.id`, `sales.id`, etc.) — resolved via `entity_type` |
| action | enum(`created`,`confirmed`,`voided`,`closed`,`refunded`,`adjusted`,`updated`,`deactivated`,…) | **also a real enum** |
| actor_owner_id / actor_staff_id | — | who performed it, per the actor pattern |
| occurred_at | timestamp | |
| metadata | jsonb | free-form details not captured by the fixed columns — e.g. a container close: `{ "deviation": -15, "close_reason": "spillage" }`; a void: `{ "reason": "..." }`; an edit to a still-editable descriptive field: `{ "field": "supplier_name", "old": "...", "new": "..." }` |

> **Scope note:** this table is for business-scoped events by business actors (Owner/Staff). Platform-level actions (e.g. App Admin editing Standard Units) are a separate concern — not yet decided whether they get their own log or a `business_id = null` variant of this one.

---

## 8. Key Relationships Summary

```
owners ──< businesses ──< staff
                       └──< customers
                       └──< products ──< product_mous (base + optional MOU rows)
                                     └──< custom_units (based_on a product_mous row)
                                     └──< unit_sale_prices (polymorphic: product_mou | standard_unit | custom_unit)

owners ──< account_identities >── staff   (exactly one side per row)

dimensions ──< standard_units   (platform-level, shared across all businesses)
dimensions ─── reference_unit_id ──> standard_units   (one designated reference per dimension)

products ──< batch_lines >── batches
products ──< containers
products ──< inventory_adjustments
products ──< sale_lines >── sales ──< payments
sales ─── customer_id ──> customers   (nullable)
sales ─── staff_id ──> staff          (nullable, attribution only — not the acting actor)
containers ──< sale_lines        (nullable FK; only set for targeted partial sales)
containers ──< inventory_adjustments (nullable FK; optional correction reference)

Every action-recording table (batches, containers, sales, payments, inventory_adjustments, audit_log)
carries an actor_owner_id / actor_staff_id pair — exactly one non-null — instead of a single actor_id.
```

---

## 9. Open Implementation Notes

1. **Stock as a derived ledger, not a stored source of truth:** treat `batch_lines`, `sale_lines`, `inventory_adjustments`, and container open/close events as an **immutable ledger**. `products.current_sealed_stock`, `containers.remaining_mou_qty`, and `sales.amount_paid`/`balance_due` are all **derived values** — recomputable at any time from that ledger — not authoritative numbers in their own right:
   - `current_sealed_stock` = `SUM(batch_lines.quantity_in_bu)` − `SUM(direct sale_lines not tied to a container, via quantity_in_standard_unit)` − `SUM(container opens)` − `SUM(inventory_adjustments)`.
   - `containers.remaining_mou_qty` = `initial_mou_qty` − `SUM(sale_lines.quantity_in_standard_unit where container_id = this container)`.
   - `sales.amount_paid` = `SUM(payments.amount)` for that sale.

   This matters because it makes these numbers **self-correcting rather than silently-wrong-forever**: if a bug or race condition corrupts a cached copy, it can simply be recomputed from the ledger. If the _ledger itself_ was wrong, the fix is never to edit history — it's a compensating `inventory_adjustment` (or, for payments, an equally-and-oppositely-signed correction), so the mistake and its fix both stay visible in the audit trail.

   For query performance, it's fine to keep these as **cached columns updated transactionally alongside each ledger write** — an optimization, not a change of authority. Include a **"recalculate" action** (per product, container, or sale) that recomputes from the ledger and overwrites the cache — both a bug-recovery tool and a trust-building feature for the business owner.

2. **Actor and unit references use multiple nullable FKs with a CHECK constraint**, not a `type` + generic `ref_id` polymorphic pair — resolved per the Architecture doc's decision that Prisma doesn't model true polymorphism cleanly, applied consistently across `unit_sale_prices`, `batch_lines`, `sale_lines`, `inventory_adjustments`, and every actor-recording table.
3. **`dimensions.reference_unit_id` has a creation-order dependency** on `standard_units` (a dimension needs at least one unit to exist before it can designate a reference) — handle via a nullable FK, created dimension-first-then-unit-then-linked, not a hard NOT NULL constraint.
4. **Multi-MOU** (v1 UI ships single-MOU): schema already supports it via multiple `product_mous` rows with `unit_role = 'mou'` — no migration needed when the UI catches up later.
5. **Business-switcher session concept:** since an Owner can operate multiple Businesses, "which business is this request for" must be resolved from the authenticated session/request context (e.g. a selected-business header or route param), not assumed from identity alone — this is an Architecture-level concern (see Architecture doc §6), not a schema field; no server-side "current active business" column is proposed here.
6. **Batch Line unit restriction** (should purchasing be limited to BU-dimension units, excluding MOU-based units like `shot`?) remains an open question — see the note under §4.
7. **Void vs. Refund** is recorded here as two distinct concepts (see §6) but hasn't been explicitly confirmed as final — flagged for revisit if needed.
