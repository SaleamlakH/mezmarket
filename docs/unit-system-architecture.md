# Unit System Technical Architecture

### Conversion Facts, Transaction Snapshots, and the Limits of What the Schema Can Guarantee

---

## 1. Purpose and Scope

This document specifies how the system models the units a product is bought, stocked, and sold in, how a quantity in one unit is converted into another, and how every transaction records what it did. It defines what is treated as a fixed fact, what is derived, and — because the system cannot observe the physical world it is recording — which classes of real-world error the data model is structurally unable to detect.

Unit conversions are load-bearing: a single wrong conversion factor silently propagates into every stock figure, every cost, and every margin that follows it. This document makes that dependency explicit so the accepted posture (Section 7) and its consequences are recorded, not discovered later.

The document covers the unit model, the conversion math, the snapshot/ledger model, and the integrity limits. It does not re-specify the catalog, intake, or sales features, which are described in `docs/features/`.

---

## 2. Terminology and Model

Units exist at two levels: platform-wide definitions, and per-product rows that select and relate those definitions.

### 2.1 Platform level (admin-managed, shared across all tenants)

| Entity               | Role                                                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dimension`          | A category of measure — Volume, Weight, Length, Count, …                                                                                                                                 |
| `DimensionReference` | The one Standard Unit per Dimension that every other unit in that dimension is ratio'd against (kept as a separate table so a Dimension is never temporarily without a valid reference). |
| `StandardUnit`       | A concrete unit within a Dimension — `ml`, `L`, `g`, `kg`, `pc`, `m` — carrying `ratioToReferenceUnit`, how many of this unit equal one of the Dimension's reference unit.               |

Conversions are only meaningful **within the same Dimension**. Converting `ml` to `g` needs a density, which is deliberately out of scope.

### 2.2 Product level (`ProductUnit`)

Every transactable unit a product has is one `ProductUnit` row.

| `unitRole` | Meaning                                                                                                                                    | `standardUnitId` | `dependsOn`         | `conversionRate`                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ------------------- | ------------------------------------ |
| `BASE`     | The product's Base Unit (BU) — the primary unit stock is counted in.                                                                       | non-null         | null                | null                                 |
| `MOU`      | Measurement/Content Unit — an objectively measurable quantity inside one BU (e.g. `1 pc = 350 ml`).                                        | non-null         | `BASE`              | how many MOU per one BU              |
| `STANDARD` | A same-dimension Standard Unit explicitly added to the product (e.g. `L` alongside a `ml` base).                                           | non-null         | its dimension's hop | computed from `ratioToReferenceUnit` |
| `CUSTOM`   | An owner-defined label based on BASE or MOU — a real fraction (`slice = 1/8 pc`, `shot = 25 ml`) or a 1:1 friendly name (`bottle = 1 pc`). | null             | `BASE` or `MOU`     | entered by the owner                 |

A product therefore spans **two unrelated dimensions**: its Base Unit's dimension and its MOU's dimension (when it has one). The base unit is not a stored pointer; it is whichever row carries `unitRole = BASE`.

---

## 3. Conversion Math

Every line conversion is a two-step derivation; neither step mutates anything.

**1. Standard denomination** — the figure shown alongside the user's entry.

- A row that has a `standardUnit` is expressed in that unit **unchanged**, labelled with that standard unit.
- A `CUSTOM` row (which has no `standardUnit`) converts through its `dependsOn` role and is expressed in that role's standard unit.

**2. Base quantity** — the figure that moves the ledger, converted toward `BASE`.

- The same role as the target ⇒ the quantity is unchanged.
- `MOU` rates **divide**; `STANDARD`/`CUSTOM` rates **multiply**.
- If the unit's `dependsOn` is not the target, it hops once more through the product's MOU down to `BASE`.

The practical consequence: a line's **base quantity** — what actually moves the ledger — is always computed, never stored on the line itself (see Section 4).

---

## 4. Snapshot and Ledger Model

Every transaction line records two things: what the user entered, and the normalized figure derived from it at that moment.

```
   Conversion facts                 Transaction snapshot                Ledger (base units)
   ─────────────────                ────────────────────                ────────────────────
   StandardUnit.ratio ─┐
   MOU Pack Relation ──┼──► snapshot derivation ──► standardUnit +        currentSealedStock
   Custom factor ──────┤                          standardQuantity   ──►  quantityRemaining
   Chosen unit ────────┘──► base derivation ──► (base qty)                quantityPulled
```

**Snapshotted per line** (locked once the transaction is recorded):

| Line             | As-entered                                             | Normalized                               | Traceability only                         |
| ---------------- | ------------------------------------------------------ | ---------------------------------------- | ----------------------------------------- |
| `StockBatchLine` | `purchaseUnit`, `purchaseQuantity`, `purchaseUnitCost` | `standardUnit`, `standardQuantity`       | `productUnitId`, `resolvedStandardUnitId` |
| `SaleLine`       | `soldUnit`, `quantity`, `unitPrice`                    | `standardUnit`, `quantityInStandardUnit` | `productUnitId`, `resolvedStandardUnitId` |
| `Loss`           | `unit`, `quantity`                                     | `standardUnit`, `standardQuantity`       | `productUnitId`, `resolvedStandardUnitId` |

**Stored in base units** (the ledger):

- `Product.currentSealedStock` — per-product sealed stock.
- `StockBatchLine.quantityRemaining` — what is left of a lot.
- `SaleLineCost.quantityPulled` — how much of a specific lot a sale drew.

The `productUnitId` / `resolvedStandardUnitId` columns are **traceability only**: live links back to current configuration for drilling down, never relied on to display or recompute historical facts. If a linked `ProductUnit` is renamed or removed, the line's own snapshot columns are unaffected.

---

## 5. Lifecycle and Mutability

- **Conversion facts are set once and cannot be changed or removed.** The Pack Relation rate, and a `CUSTOM` unit's basis and factor, are locked after creation; deleting a unit is not possible. A wrong fact is therefore permanent. Changing a rate would silently re-mean every quantity already recorded against it, so it is disallowed.
- **Display names are renamable.** A unit's label never enters the math, so renaming it affects nothing derived; snapshots already froze the label as of each transaction.
- **The Base Unit ↔ MOU relation is treated as fixed.** The decision for now is that the base unit, the MOU, and their relation are not editable; the system is built on that assumption.
- **Snapshots are frozen at confirmation.** Whatever was computed at the moment of the transaction is what history shows thereafter.
- **Confirmation locks a line's core facts.** While an intake is unconfirmed, its core line fields (unit, quantity, cost) remain freely editable. Once confirmed they are locked for good — no override rewrites them — and only non-sensitive fields (`supplierName`, `referenceNumber`, `expiryDate`) stay editable. The uniform rule: once anything is finalized, its core recorded facts are never rewritten.

---

## 6. Integrity Limits — What the Schema Cannot Detect

The schema stores the values _derived from_ conversion facts. It never stores an independent ground truth against which those facts could be checked. Four classes of error therefore enter undetected and are permanent:

### 6.1 Wrong multiplier set up on a new product (MOU Pack Relation)

The owner sets `1 BU = X MOU` once, at product creation. If `X` is wrong, there is nothing in the system that knows the "correct" value — the owner's entry is the only source of truth. Every batch line, sale line, and loss on that product derives its base quantity from that relation, so a single wrong `X` corrupts all of them. Because the relation cannot currently be edited, and because snapshots already taken are frozen, the error is unrecoverable through the application.

### 6.2 Wrong custom-unit mapping

A `CUSTOM` unit records both a **basis** (`dependsOn`: BASE or MOU) and a **factor**. Mapping it to the wrong basis, or entering the wrong factor, is the same class of error as 6.1 with the same permanence: nothing validates the owner's assertion, and every derived base quantity inherits the mistake.

### 6.3 Wrong unit or quantity entered during a transaction

At intake, sale, or loss, the operator picks a unit and types a quantity. If the wrong unit is selected, or the wrong quantity is entered, the system faithfully snapshots it and moves the ledger by exactly that amount. Nothing reconciles the entry against physical reality — the system has no second source to compare against.

Correction is limited to the window before the intake is confirmed: while an intake is still a draft, its lines can be edited freely — but that edit is itself the same class of human-asserted input, simply not yet finalized. Once confirmed, the core line facts are locked for good. The audited **direct override edit** that other documentation describes ([schema.md](./schema.md), [prd.md](./prd.md)) is not carried and is excluded here: it would be identical in nature to the mistake it purports to fix while silently rewriting a finalized record. There is no re-entry path for a sale line or a loss either; a wrong sale is corrected only by void/refund, and a wrong loss has no re-entry path at all.

### 6.4 Wrong platform ratio (admin)

`StandardUnit.ratioToReferenceUnit` is set by the platform admin and is shared across every tenant. A wrong platform ratio shifts every same-dimension conversion system-wide. It is called out for completeness; it is out of a tenant's control.

**Common shape:** in every case the system cannot detect the error because it would need an external fact (the real weight of a bottle, the real count in a case) that it was never given. The schema's job is to record _what was asserted and computed_, not to _verify_ it.

---

## 7. Accepted Decision and Posture

For now the design is kept as-is, on the explicit assumption that **the Base Unit, the MOU, and their relation cannot be changed or edited** — conversion facts in general are locked, while display names remain freely renamable. The system trusts conversion facts as entered and does not attempt to validate them against the outside world. Wrong entries are correctable only up to confirmation, and only within the transaction being corrected; after an intake is confirmed, no correction path exists at all. The recorded limit is that the database cannot detect a wrong multiplier, a wrong custom-unit mapping, a wrong unit/quantity at transaction time, or a wrong platform ratio — and, under the lock on conversion facts, cannot fully repair one after it has affected stock.

---

## 8. Existing Mitigations and Gaps

**What exists today**

- **Draft intakes are fully editable until confirmation.** A wrong line caught before confirming is corrected as an ordinary edit — same trusted-as-entered input, simply not yet finalized.
- The **negative-stock warning** at sale time, which surfaces a symptom (stock below zero) that a wrong factor can cause but cannot diagnose.
- **Loss** records tied to a real lot, giving shrinkage a home.
- Snapshots that keep a recorded sale meaning the same real-world amount forever, even if configuration later changes.

**What is missing**

- No way to change a conversion fact or remove a unit after creation (re-rate or delete — names may be renamed freely).
- No way to revise a confirmed batch's core facts — the audited **direct override edit** described in [schema.md](./schema.md) and [prd.md](./prd.md) is not carried; a confirmed line's core facts stay locked and are never rewritten.
- No way to correct a sale line's or a loss's recorded unit/quantity short of void/refund.
- No reconciliation against a physical count, and no unit-template library to reduce setup typos.
- No workflow that would flag a suspiciously wrong factor before it is used.

---

## 9. Future Directions (not committed)

- **Unit versioning / append-only units** — edits create new rows so historical conversions stay resolvable without mutating the past.
- **Snapshotting the multiplier** — persist the conversion actually used on each line, so the derived base quantity is self-contained and never re-derived from mutable configuration.
- **Corrective workflows** — a deliberate, high-trust reversal path (e.g. a documented contra-entry) for confirmed intakes, sales, and losses. Any path that silently rewrites a confirmed transaction's core facts is excluded by design.
- **Setup guardrails** — unit templates and sanity checks to reduce the chance of a wrong multiplier at creation.
