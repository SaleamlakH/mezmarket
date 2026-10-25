# Product Requirements Document

## Inventory & Sales Management App for Small/Medium Businesses

---

## Table of Contents

1. [Overview](#1-overview)
2. [Users & Roles](#2-users--roles)
3. [Core Concepts & Data Model](#3-core-concepts--data-model)
4. [Functional Requirements](#4-functional-requirements)
5. [Unit System — Detailed Rules](#5-unit-system--detailed-rules)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Decisions Log](#7-decisions-log)
8. [Suggested Phasing](#8-suggested-phasing)
9. [Success Metrics](#9-success-metrics)

---

## 1. Overview

A mobile-first web app that lets small and medium businesses (SMBs) — of any kind, not tied to one industry (retail shop, bar, pharmacy, salon, hardware store, etc.) — manage product configuration, inventory intake, sales, and basic reporting. The business has no formal departments: typically an **Owner/Manager** and one or more **Cashiers/Staff**. Front-line workers who never touch the app (e.g., waiters) are out of scope as users; they only affect the business indirectly (e.g., a cashier records the sale a waiter took the order for).

### 1.1 Problem statement

Most inventory/POS tools are either too generic (spreadsheets — no batch/lot tracking, no partial-unit sales) or too specific (built only for restaurants, or only for retail). SMBs need something in between: simple enough for a non-technical owner to configure in an afternoon, but flexible enough to handle both whole-unit sales (a t-shirt, a bag of rice) and partial/bulk sales (a shot from a bottle, a slice from a cake, a meter cut from a roll of fabric).

### 1.2 Goals

- Let an owner configure their product catalog, units, and pricing without engineering help.
- Track inventory accurately at the base-unit level, including partially consumed containers.
- Let cashiers record sales quickly (mobile-first, few taps) and generate invoices.
- Give the owner visibility into paid vs. pending sales and basic business performance via a dashboard.

### 1.3 Out of scope (v1)

- Multi-location / multi-warehouse transfer logic (single location per business in v1).
- Payroll, HR, or shift management.
- Accounting/tax filing integration.
- Complex role hierarchies (department heads, approval chains).
- Offline-first / full PWA sync (may be a fast-follow).

---

## 2. Users & Roles

**Owner and Staff are separate concepts, not one shared account type:**

- **Owner** — a person, not scoped to any single business. **One Owner can own multiple Businesses.** Owners sign up publicly (the only self-service signup path in the app); doing so simultaneously creates their first Business. An Owner has full access within each business they own: catalog, units, pricing, batches, sales, reports, and staff management.
- **Staff** — scoped to exactly one Business. Covers **Manager**, **Cashier**, and **Server** (waiter) under one umbrella — Server is not a separate non-login concept anymore, it's just a Staff role.
  - **Manager:** delegated admin — same as Owner minus business settings/billing (configurable).
  - **Cashier:** front-desk operator — create sales/invoices, view own sales, open/close partial containers, view stock (read-only for catalog).
  - **Server:** attribution-only — can be tagged on a sale as who took the order, but has no permissions and typically no login at all.
- **App Admin** — platform-level, manages system-level Standard Units and platform config. Not a business-level role — operates above all tenants.

**No self-service signup for Staff.** There is no invite-link/email-confirmation flow. An Owner or Manager creates a Staff record directly and, if that role needs app access (Manager/Cashier almost always do; Server usually doesn't), creates and hands over credentials themselves — login capability is a per-record choice, not automatically tied to role.
x
**Identity is decoupled from the auth provider.** Whatever handles login (currently Supabase Auth) is treated as a swappable detail behind an internal identity link, not baked into business records directly — so a provider change or a provider-side id change never cascades into sales, batches, or any other data.

**Internally, the Owner is represented the same way Staff are.** Each Business automatically gets one internal team-member record for its Owner, with a role that can never be changed. This is an implementation detail, not a user-facing distinction — nothing changes about how the Owner signs up, logs in, or operates the business.

Businesses are **tenants**; each tenant has its own products, batches, sales, and members. Standard Units are shared/global, managed at the platform level (see §5).

---

## 3. Core Concepts & Data Model

### 3.1 Standard Units (platform/system level)

- Managed by the App Admin, shared across all tenants.
- Grouped by **dimension**: Volume, Weight, Length, Count, (extensible).
- Examples: `ml`, `L`, `g`, `kg`, `piece`, `m`, `cm`.
- Conversions only make sense **within the same dimension** (you can't convert `ml` to `g` without a density, which is out of scope for v1).

### 3.2 Products

Each product has:

- Name, category, description, image (optional).
- **Base Unit (BU)** — a Standard Unit (any of them: `pc`, `kg`, `m`, `L`, `ml`, …). The primary unit stock is counted/tracked in (e.g., tequila → `pc`; loose rice sold from a sack → could be `kg` directly).
- **MOU (Measurement/Content Unit)** — optional, a Standard Unit describing an objectively-measurable quantity _inside_ one BU, used only when BU and the natural content measure are unrelated units (`pc` vs `ml`). Skip it entirely when BU already _is_ the measurable unit (a t-shirt: BU = `pc`, nothing further to measure).
  - A product may have **zero or more MOUs** in the data model (e.g., a box of nails: `MOU: kg` and, separately, a nail-count concept) — v1 UI supports **one MOU per product**; multiple MOUs is a fast-follow (see §8).
  - **Pack Relation**: `1 BU = X MOU`, set once per product by the Owner (e.g., `1 pc = 350 ml`). No cross-MOU ratios are computed or stored — each MOU's relation to BU stands alone.
  - MOU is reserved for units a scale/ruler/volume-measure can confirm. Anything inherently fuzzy or conventional (a slice, a portion, a handful) is **not** an MOU — see Custom Units below.
- **Custom Units** — named units _based on_ BU or an MOU, each with an explicit factor. Two uses:
  1. **Fractional/conventional units** — e.g. `slice = 1/8 pc` (cake), `shot = 25 ml` (tequila, based on MOU). Used when the real-world portion isn't itself a Standard Unit.
  2. **Friendly relabeling** — e.g. `bottle = 1 pc` (1:1 factor), purely so staff see "Bottle" instead of "pc" on the sale screen, or to disambiguate two different things that both happen to use the same underlying Standard Unit type (e.g. "Box = 1 pc" on one product vs "Nail" as a fractional/1:1 custom unit on another).
  - Each transactable unit (BU, MOU, or Custom) is flagged as usable in **Purchasing**, **Selling**, or **Both**.
- **Pricing**: any transactable unit — BU, any MOU, or any Custom Unit — can carry its own independent price (not just custom units). E.g. tequila can have a price per `pc` (bottle) and a separate price per `shot`.
- Track-as-partial flag: marks a product as "openable" (see §3.4) vs. simple whole-unit stock (a t-shirt is never "half open").

> Cost is recorded per Batch Line (§3.3) each time the product is actually purchased, since the real cost can and does change batch to batch. Margin reporting (§3.8) is derived from that batch cost history rather than a manually-maintained field that would otherwise drift out of date.

**Standard-unit conversion math between the _same dimension_ is system-wide and automatic** (1 L = 1000 ml is always true, fixed by the App Admin) — but **using** a same-dimension unit on a specific product is an explicit action, not something that appears automatically. Adding `L` alongside a product whose Base Unit is `ml` means adding it as a sellable unit on that product; the _conversion factor_ for that addition is computed automatically from the platform-level facts, so the owner never types a ratio in by hand — only the decision to add the unit at all is manual. This is unrelated to the BU↔MOU Pack Relation, which is product-specific because it links two _unrelated_ dimensions (Count↔Volume, Count↔Weight, etc.).

**Package-size variants are separate Products.** Because `pc` means something different for a 5 L oil bottle than a 10 L oil bottle (different Pack Relation), these are modeled as **distinct Products**, each with its own BU stock and its own Pack Relation — not one product with conflicting `pc` definitions. Same logic for 350 ml wine vs. 500 ml wine.

**Worked examples (matching your scenarios):**

| Product           | BU  | MOU      | Pack Relation   | Custom Units                  | Sellable as            |
| ----------------- | --- | -------- | --------------- | ----------------------------- | ---------------------- |
| Tequila 350 ml    | pc  | ml       | 1 pc = 350 ml   | `shot = 25 ml` (based on MOU) | pc, ml, L (auto), shot |
| Cooking Oil 5 L   | pc  | ml       | 1 pc = 5000 ml  | —                             | pc, ml, L (auto)       |
| Cooking Oil 10 L  | pc  | ml       | 1 pc = 10000 ml | —                             | pc, ml, L (auto)       |
| Cake              | pc  | — (none) | n/a             | `slice = 1/8 pc`              | pc, slice              |
| Box of nails      | pc  | kg       | 1 pc = 5 kg     | `box = 1 pc` (label only)     | pc/box, kg             |
| Loose rice (sack) | kg  | — (none) | n/a             | —                             | kg, g (auto)           |
| Plain T-shirt     | pc  | — (none) | n/a             | —                             | pc                     |

> **Design summary:** BU and MOU are both Standard Units; MOU is only needed when BU doesn't already express the measurable content. Custom Units always derive from BU or an MOU with an explicit factor — whether that factor represents a real fractional portion (slice, shot) or is just a 1:1 friendly name (bottle, box). Using a same-dimension Standard Unit (L alongside ml) on a specific product requires an explicit add action, though the conversion math for it is computed automatically, never typed in by hand; BU↔MOU requires the owner to set the relationship directly, since it bridges two unrelated dimensions.

### 3.3 Batches (Inventory Intake)

- A Batch = one purchase/transport event, with a date, supplier (optional), and reference/invoice number.
- A Batch contains one or more **Batch Lines**, each line referencing one product, a quantity in a chosen purchase unit (base or custom), unit cost, and expiry date (optional, useful for perishables).
- On confirming a batch, each line's quantity is converted to the product's base unit and **added to that product's stock**.
- Batch lines that are "openable" products create **Container** records lazily (on first open), not at intake — intake just increases total base-unit stock.
- owner/managers can override any field if they got any wrong entered data, providing a required reason.

### 3.4 Loss

- A standalone record for stock that's gone, discovered outside the normal sale flow — damaged or expired goods found on the shelf.
- Always tied to a specific Batch Line: the system suggests a default (the oldest lot of that product with remaining stock), but the person recording the loss can select a different one if they know it's actually a different lot.
- Fields: product, the affected Batch Line, quantity (in whatever unit fits how the loss was discovered, normalized to a standard-unit figure the same way batch and sale lines are), a reason from a fixed set (Damage, Expired, Other) with optional free-text detail, actor, timestamp.
- Restricted to Owner/Manager.
- Feeds the same audit log as batches, sales, and container closes (§6), and can optionally roll up into the dashboard's shrinkage view alongside container deviations (§3.5).

### 3.5 Partial / Open Containers

For products flagged as track-as-partial (products with an MOU and at least one Sell-capable unit smaller than the BU, e.g. `shot` on tequila):

- Stock exists at two levels: **sealed stock** (whole BU count, e.g., "10 pc sealed") and **open containers** (each an instance with `remaining_MOU_qty` out of `initial_MOU_qty`, e.g. 350 ml).
- **Multiple containers of the same product can be open simultaneously** (e.g., two tequila bottles open at once).
- Opening a new container is always an explicit action (convert 1 sealed BU → 1 open container) — never silent/automatic.
- A partial sale always **targets a single, cashier-selected open container** — no auto-distribution across multiple open containers. If the selected container doesn't have enough remaining, the system warns but does not block; the sale proceeds and the container's remaining goes to zero or negative-leaning, captured as a deviation at close (see below).
- **Closing a container is always a manual action** — never automatic, even when remaining hits 0. A depleted container can sit open until someone closes it. Closing itself is the signal that nothing further will be sold from it.
- **On close**: the system computes the **deviation** automatically as whatever the ledger still expects to remain at that moment (`initial_MOU_qty` − everything sold against that container). If the ledger still expects, say, 1 shot's worth left when the container is closed, that's the deviation (a loss — over-pouring/spillage/theft consumed it without being recorded as a sale); if the expected amount had already gone negative before close (an oversell the system warned-but-allowed per the rule above), that negative amount is the deviation in the other direction (under-pouring — more was sold than the container should have held). The deviation is stored as a permanent log entry — this becomes the shrinkage/waste signal referenced in the dashboard (§3.8). Closing accepts an **optional free-text reason** (e.g. "spillage," "sample given," "suspected theft") for context — never required.
- UI must show, per partial product: how many sealed BU remain, and a list of currently open containers each with remaining/initial MOU. **The unit used to display remaining/deviation is selectable by the viewer** (e.g. view in `ml`, `L`, or `shot`) — this is a display-time conversion only and doesn't change what's stored.

### 3.6 Sales & Invoices

- A Sale/Invoice has: date/time, **acting Owner/Staff** (whoever processed it — captured automatically), one or more **line items** (product, unit sold, quantity, unit price, subtotal), discount (optional), tax (optional, see below), total, payment status, optional **Server attribution** (a Staff member with role Server, selected from the business's staff, see §2) for sales where a waiter took the order but didn't process it in the app themselves, and an optional **Customer** reference for Pending/Partially Paid sales so it's clear who owes the balance.
- **Historical integrity of units and quantities, and costs:** every line (on a Sale or a Batch) permanently records the unit chosen (as entered), the quantity in that unit, **and** the standard-unit equivalent (resolved standard unit and the quantity), and also the cost at the moment of the transaction. units are mutable configuration; the standard-unit figures are the fixed historical fact and must never be silently recomputed from a Custom Unit's _current_ factor. This is what keeps a sale recorded as "2 shots" meaning the same real-world amount forever, even if the owner later redefines what a `shot` equals — and it's also what container deduction (§3.5) draws from: a container's remaining is always decremented using a sale line's snapshotted standard-unit quantity, never re-derived after the fact.
- **Payment status:** `Paid`, `Pending` (credit/tab), `Partially Paid` — with amount paid and balance due tracked, and a payments log per invoice (multiple partial payments over time), each optionally noting a payment method (cash, card, bank transfer, mobile money, or other).
- **Customer (new):** a lightweight, no-login reference (name, optional contact) a business can attach to any sale — with or without payment — so the transaction is explicitly linked to that individual for tracking, reporting and operational history; a Pending/Partially-Paid sale in particular can then answer "who owes this" (§3.8). Same non-login pattern as a Server, but representing who's buying rather than who's staff. The customer is a property of the sale itself and never dictates or depends on the payment method or status.
- Selling a partial unit (e.g., `shot`) draws from open containers per §3.5.
- Selling a whole/simple unit (e.g., `piece`, `bottle`) draws directly from base-unit stock. If the sale would take sealed stock negative, the system warns but does not block by default — controlled by a business-level setting, "Allow selling beyond recorded stock" (default: on), so stricter businesses can turn it off.
- Invoice is generated on sale confirmation (viewable, printable/shareable — PDF or shareable link).
- **Tax:** each business can configure a single default tax rate (or none) at setup, auto-applied to invoice totals. Line prices always exclude tax; when the business enables tax on sales, the invoice adds tax as its own line at the configured rate. Per-product tax rates/classes are out of scope for v1 (see §8).
- Sales can be voided/refunded (with reason), which restores stock. Each product has a **default refund behavior** (restock or not — e.g. an unopened bottle defaults to restock, a poured shot defaults to not), but the person processing the refund can **override the default per sale line** when the situation warrants it.

### 3.7 Audit Log

A system-maintained, append-only record of every significant action taken across the business — batches confirmed, direct override edits to a locked batch line, sales voided, containers closed, losses recorded, staff created or deactivated, and similar. Each entry captures which record was affected, what happened, who did it, when, and any action-specific detail, such as a changed field's old and new value. Entries are written automatically by the system at the moment an action happens — never typed in directly by a user. This is distinct from a reason a user does provide (a Loss's category, an override edit's justification): that reason becomes part of what gets recorded, not the record itself. Only the Owner or Manager can view it, and nothing in it is ever edited or removed.

### 3.8 Dashboard / Reports

- Sales overview: total sales, paid vs. pending, by day/week/month.
- Top-selling products, by revenue and by quantity.
- Low-stock alerts (below a configurable threshold per product).
- Open containers overview (what's currently open, how much is left).
- Basic margin report: revenue − cost, where cost is derived from Batch Line cost history for that product on a first-in-first-out basis (each sale is costed against the specific, oldest-available purchase lot it actually drew from, not an average). A completed sale's cost is fixed at the moment of sale, snapshotted from that lot's cost at the time it was pulled — a later correction to a batch line's cost (via the direct override edit path) never retroactively changes the margin already reported on a past sale.
- Outstanding balances (pending/partial invoices, who owes what).

---

## 4. Functional Requirements

### 4.1 Product & Unit Configuration

- FR1: App Admin can create/edit/deactivate Standard Units, each with a name, symbol, and dimension, and manage fixed same-dimension conversion rates.
- FR2: Owner/Manager can create/edit/deactivate Products, setting name, category, Base Unit (BU), image, description.
- FR3: Owner/Manager can optionally set one or more MOUs per product (v1: one), each a Standard Unit, with an explicit Pack Relation to BU (`1 BU = X MOU`).
- FR4: Owner/Manager can define Custom Units per product, based on BU or an MOU, with an explicit factor (fractional or 1:1), and flag each as Purchase/Sell/Both.
- FR5: Owner/Manager can set an independent sale price on any transactable unit — BU, any MOU, or any Custom Unit.
- FR6: Owner/Manager can flag a product as track-as-partial (requires an MOU and a qualifying Sell-capable unit per §5 rule 11).
- FR6a: Owner/Manager can add a same-dimension Standard Unit to a product as a sellable/purchasable unit; its conversion factor is computed automatically, but adding it is a deliberate action, not something that appears on its own.
- FR7: Owner/Manager can set a low-stock threshold per product (in BU terms).

### 4.2 Inventory / Batches

- FR8: Owner/Manager can create a Batch with multiple product lines, each with quantity (in a purchase-capable unit), unit cost, and optional expiry.
- FR9: On batch confirmation, stock is incremented in each product's Base Unit (BU).
- FR10: Users with permission can view batch history and drill into a batch's lines.
- FR11: Owner/Manager can perform a direct override edit on a specific, known-wrong Batch Line's locked fields, providing a required reason; the change is captured in the audit log as the field, its old value, and its new value..

### 4.3 Sales

- FR12: Cashier can start a new sale, add multiple products/lines, choosing unit and quantity per line, with an optional Server (a Staff member with role Server) selected for attribution.
- FR12a: Owner/Manager can create a Staff record with role Server; a Server typically has no login credentials at all, but this isn't hard-enforced by the system.
- FR13: For partial products, system shows all currently open containers and lets the cashier select which one a partial sale draws from; cashier can also open a new sealed unit explicitly.
- FR13a: Authorized users can manually close an open container at any time; the system computes the deviation automatically as whatever remains expected in the ledger at that moment (no manual quantity entry required), and the closer may optionally add a free-text reason.
- FR13b: Anywhere remaining stock or deviation is shown, the viewer can select which of the product's transactable units to display it in.
- FR14: System calculates line subtotals, invoice total, supports discounts and a business-level default tax rate.
- FR14a: If a sale would take sealed stock negative, system warns but proceeds unless the business has disabled "Allow selling beyond recorded stock."
- FR14b: Every Batch and Sale line permanently records both the unit/quantity as entered and the resolved standard-unit equivalent at that moment; later edits to a Custom Unit's factor never retroactively change past records.
- FR15: Cashier can mark invoice as Paid, Pending, or record a partial payment.
- FR16: System generates a viewable/shareable invoice on confirmation.
- FR17: Owner/Manager (and Cashier for their own sales, if allowed) can view sale history, filterable by status/date/product.
- FR18: Authorized users can void/refund a sale with a reason; each product has a default restock behavior, overridable per sale line at refund time.

### 4.4 Dashboard

- FR19: Dashboard shows sales totals (paid/pending) over selectable time ranges.
- FR20: Dashboard shows low-stock and open-container widgets, including per-container deviation/shrinkage totals.
- FR21: Dashboard shows top products and margin, where margin is derived from Batch Line cost history on a first-in-first-out basis, using each sale's snapshotted cost at time of sale — never a live/current cost that could shift after a later batch-line correction.

### 4.5 Access & Roles

- FR22: Owner can create Staff records directly (Manager, Cashier, or Server role) and, where the role needs app access, create and hand over that Staff member's login credentials — no self-service signup or invite-link flow for Staff.
- FR23: Permissions are enforced per role as in §2 (configurable per business where noted).
- FR24: One Owner identity can own and switch between multiple Businesses; each Staff record is scoped to exactly one Business.
- FR25: Owner, Manager or Cashier can create a Customer reference (name, optional contact) and attach it to a sale, for tracking who owes an outstanding balance. Customers are mostly recorded at the point of sale, so the cashier processing a sale can create one without leaving the sale flow.

### 4.6 Audit

- FR26: System automatically logs every significant action (batch confirmed, direct override edit, sales, Loss recorded, staff created/deactivated, and similar) with actor, timestamp, and action-specific detail — no user input required to create a log entry.
- FR27: Owner/Manager can view the audit log, filterable by entity type, date range, and actor.

---

## 5. Unit System — Detailed Rules

1. A Standard Unit belongs to exactly one Dimension (Volume, Weight, Length, Count, …).
2. Conversions **between Standard Units of the same Dimension are fixed, system-wide facts** (e.g. 1 L = 1000 ml; 1 kg = 1000 g), set once by the App Admin — never per product, never per business.
3. A Product's **Base Unit (BU)** must be a Standard Unit — the primary unit stock is counted/tracked in.
4. A Product may optionally have one or more **MOUs** (Measurement/Content Units), each a Standard Unit representing an objectively-measurable quantity (weighable, pourable, ruler-measurable) inside one BU. MOU is only needed when BU doesn't already express that measurable content itself. v1 UI supports one MOU per product; the data model allows more (see §8).
5. Each MOU has its own **Pack Relation** to BU (`1 BU = X MOU`), set by the Owner. **There is no derived or enforced relationship between two MOUs on the same product** — each stands alone against BU only.
6. **Custom Units** are based on BU or an MOU with an explicit factor, and cover two purposes:
   - Fuzzy/conventional real-world portions that aren't themselves Standard Units (`slice = 1/8 pc`, `shot = 25 ml`).
   - Friendly relabeling of an existing unit, including 1:1 factors (`bottle = 1 pc`), used for clarity or to disambiguate two same-typed units on different products.
7. A product can be transacted in: its BU, any MOU it has, any Standard Unit explicitly added to it (its conversion math computed automatically per rule 2, but the addition itself is a deliberate action), or any of its Custom Units.
8. Every transactable unit — BU, MOU, or Custom — can carry its own independent price, flagged for Purchasing, Selling, or Both.
9. Products with different physical package sizes (5 L oil vs. 10 L oil) are separate Products, each with its own BU stock total and its own Pack Relation(s) — never shared or reused across genuinely different container sizes.
10. Stock quantity is stored internally in BU terms for sealed stock and in MOU terms for open-container remaining (needed for consistent math and partial-consumption tracking), but this is an implementation detail: batch lines, sale lines, and invoices always record and display the unit actually chosen by the user.
11. A product is eligible for `track-as-partial` only if it has an MOU and at least one Sell-capable unit (MOU-based or Custom) smaller than one BU.
12. Every transaction line (Batch, Sale, or Inventory Adjustment) permanently snapshots both the unit-as-entered/quantity **and** the resolved standard-unit (which unit, and the quantity in it) at the time of the transaction. Custom Units are mutable, editable configuration; the snapshotted standard-unit figures are the fixed historical record and are never recomputed from a Custom Unit's current factor after the fact.
13. Any place remaining stock or deviation is displayed, the **viewing unit is selectable** by the user (any of the product's transactable units) — purely a display-time conversion computed from the stored standard-unit figures, never a stored choice.

---

## 6. Non-Functional Requirements

- **Mobile-first responsive UI**; must be fully usable on a phone browser (owner/cashier are often on phones, not desktops).
- **Performance:** sale entry flow should be completable in well under a minute for a typical 3-line sale.
- **Multi-tenant data isolation**: one business must never see another's data.
- **Business switching:** since one Owner can operate multiple Businesses under a single identity, the active business context must be explicitly resolved per session/request — never assumed. Staff, by contrast, belong to exactly one business, so this only applies to Owner sessions.
- **Auditability:** stock-affecting actions (batch confirm, container open/close, sale, void/refund) should be logged with actor and timestamp.
- **Currency/locale:** each business configures a single currency and number format at setup (v1 has no multi-currency support within one business).
- **Availability:** standard web-app uptime expectations; no hard real-time requirement.

---

## 7. Decisions Log

**Resolved:**

- Same-dimension Standard Unit availability: using a Standard Unit on a specific product requires an explicit add action; the conversion math for that addition is computed automatically from platform-level facts.
- Loss tracking: scoped narrowly to damage/expiry, always tied to a specific Batch Line (system-suggested, user-overridable) so cost is always read from a real purchase record rather than estimated.
- Refund policy: product-level default (restock or not), overridable per sale line at refund time.
- Negative stock on sealed items: warn, don't block, by default — toggleable per business.
- Users & Roles model: Owner is a standalone identity that can own multiple Businesses; Staff (Manager/Cashier/Server unified — no separate roster) is scoped to exactly one Business each; no self-service signup for Staff, Owner/Manager provisions credentials directly; identity is decoupled from the auth provider so a provider change never cascades into business data.
- Preventing app use outside working hours: explicitly out of scope for v1 — this is a shift-scheduling problem, not an access-control one; session timeout and the audit log are considered sufficient for now (see §1.3 non-goals).
- Multi-currency: out of scope for v1, single currency per business.
- Tax: single configurable rate per business in v1; per-product tax classes deferred.
- Multi-MOU: data model supports it now; v1 UI ships single-MOU only.
- Tax: a single rate per business, off by default. When on, tax is added at checkout (line prices exclude tax, tax shown as its own invoice line).
- SKU/product code: dropped for v1 — no current feature (barcode scanning, supplier code matching) depends on it; can be added later if a concrete need arises.
- Container close: Closing is a confirm action; deviation is computed automatically as whatever the ledger still expects to remain at that moment — positive or negative — with an optional (never required) free-text reason.
- Display unit for remaining/deviation: viewer-selectable at display time (e.g. ml, L, or shot), purely a conversion of stored standard-unit figures — not a stored choice.
- Historical integrity of units,quantities and cost: every Batch and Sale line permanently snapshots both the unit-as-entered/quantity and the resolved standard-unit equivalent and the cost at that moment; later changes to units and costs never retroactively alter past records.
- every actions are recorded in the audit log

---

## 8. Suggested Phasing

- **Phase 1 (MVP):** Standard Units (admin), Product config incl. BU + single MOU + Custom Units, Batches + Loss tracking, Sales/Invoices (paid/pending, single tax rate, Reference field), open containers with manual close + deviation logging, negative-stock toggle, product-level refund defaults, basic dashboard, Owner/Cashier roles.
- **Phase 2:** Refund override UX polish, low-stock alerts, margin reporting in dashboard.
- **Phase 3:** Multi-MOU per product, per-product tax classes, Manager role nuances, multi-payment invoices, richer reports, unit templates library, multi-currency.

---

## 9. Success Metrics

- Time for a new business to go from signup to first recorded sale (target: under 15 minutes).
- % of sales entered with correct stock deduction (no manual corrections needed).
- Weekly active cashiers per business (usage stickiness).
- Reduction in "unknown stock" incidents (owner reports of mismatched inventory) vs. spreadsheet baseline (self-reported).
