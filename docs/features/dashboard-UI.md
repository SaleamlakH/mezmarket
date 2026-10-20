# Dashboard UI Specification

## 1. Scope

This document describes the dashboard screen only: how it is laid out, what each component contains, how it responds at the md breakpoint, and which roles see what. Colors, typography, spacing values, and component tokens come from the existing design system and are intentionally not specified here. Sizes are described relatively (larger, smaller, bolder, and so on). Data queries and calculation rules are out of scope.

**Terms**

- Elevated roles: Owner and Manager.
- Operator roles: Cashier and Server.
- Period: the time range chosen in the period filter.
- Snapshot: a value that always shows the current state and ignores the period filter.
- Below md: the mobile layout. At md and above: the desktop layout.

## 2. Page structure

The dashboard is one screen shared by all roles. Only the summary section differs by role. Sections, in reading order on mobile:

1. Header: page title and period filter
2. Summary: role-dependent
3. Needs attention: list of alert rows, plus a separate draft batches card
4. Your performance: the signed-in user's own figures
5. Payment methods

## 3. Responsive layout

### 3.1 Below md (mobile)

- Single column, full width, sections stacked in this order: header, summary, needs attention, your performance, payment methods.
- Header: the title and the period filter sit on one line when they fit and wrap onto two lines when they don't. The filter keeps its chips in a single row.
- Summary for elevated roles: the gross profit block sits flat (no surrounding card) above a two-by-two grid of metric cards.
- Summary for operator roles: two metric cards side by side.
- Sections are separated by a consistent medium vertical gap.

**Layout: Owner and Manager**

```
+--------------------------------------------+
| Dashboard                                  |
| [Today] [7 days] [Month] [Custom]          |
|                                            |
| Gross profit                               |
| 4,820 ETB    ^ 12% vs yesterday            |
| _.-~'_.-~'_.-~'_.-~'_.-~'_.-~'_.-~'_.-~'   |
|                                            |
| +------------------+ +------------------+  |
| | Sales            | | Cash collected   |  |
| | 18,450           | | 15,200           |  |
| | 23 sales         | | 14 payments      |  |
| +------------------+ +------------------+  |
| +------------------+ +------------------+  |
| | Outstanding now  | | Losses           |  |
| | 6,100            | | 340              |  |
| | 2,350 > 7 days   | | 2 records        |  |
| +------------------+ +------------------+  |
|                                            |
| Needs attention                            |
| +----------------------------------------+ |
| | [!] 7 products low or out of stock   > | |
| |     Sugar 1kg, Oil 5L, +5 more         | |
| |----------------------------------------| |
| | [~] 3 lots expired or expiring       > | |
| |     Earliest: Yogurt 500ml, 6 days     | |
| |----------------------------------------| |
| | [~] 4 unpaid sales                    > | |
| |     2,350 ETB due, 2 overdue           | |
| |----------------------------------------| |
| | [i] 5 open containers                > | |
| |     2 open longer than 14 days         | |
| +----------------------------------------+ |
| +- - - - - - - - - - - - - - - - - - - - + |
| : [i] 2 draft stock batches   Continue > : |
| :     Oldest: Almaz, 3 days              : |
| +- - - - - - - - - - - - - - - - - - - - + |
|                                            |
| Your performance                           |
| +----------------------------------------+ |
| | [Manager]                              | |
| | Your sales                             | |
| | 6,240                                  | |
| | -------------------------------------- | |
| | Sales count                          8 | |
| | Cash collected by you            5,100 | |
| | Unpaid sales you made                3 | |
| +----------------------------------------+ |
|                                            |
| Payment methods                            |
| +----------------------------------------+ |
| | Cash                             9,400 | |
| | ########################.............. | |
| | Mobile money                     4,300 | |
| | ###########........................... | |
| | Bank transfer                    1,500 | |
| | ####.................................. | |
| +----------------------------------------+ |
+--------------------------------------------+
```

Reading the schema: `[!]` is the urgent tone, `[~]` caution, `[i]` informational. `^` marks a positive change, the wavy line is the sparkline, the dashed box is the draft batches card, and `#` bars show each method's share of the total. The header title and period filter are shown wrapped onto two lines, as they would be on a narrow screen.

**Layout: Cashier and Server, summary section only**

This block replaces the gross profit block and the four metric cards above, which is everything between the period filter and Needs attention. Every other section in the schema above is identical for these roles.

```
+--------------------------------------------+
|                                            |
| +------------------+ +------------------+  |
| | Sales            | | Cash collected   |  |
| | 18,450           | | 15,200           |  |
| | 23 sales         | | 14 payments      |  |
| +------------------+ +------------------+  |
|                                            |
+--------------------------------------------+
```

### 3.2 md and above (desktop)

The desktop layout uses the same components as the two schemas in 3.1. Only their arrangement changes:

- The header sits on one line: title at the start, period filter at the end.
- The summary spans the full content width as its own row.
  - Elevated roles: two parts side by side. The gross profit block is placed in its own card on the left and is the narrower part. The two-by-two metric grid is on the right and is slightly wider.
  - Operator roles: the two metric cards sit side by side and together span the full row width.
- Below the summary, the page splits into two equal-width columns, aligned to the top. Columns are not required to end at the same height.
  - Left column: Needs attention (list, then draft batches card), then Payment methods.
  - Right column: Your performance.
- Within a column, cards are separated by the same medium vertical gap used on mobile.

### 3.3 Ordering note

The column grouping on desktop differs from the reading order on mobile. On mobile the order must be: needs attention, your performance, payment methods. Implement this with explicit ordering rather than relying on the source order of the two desktop columns.

## 4. Components

### 4.1 Page header

- Title “Dashboard”: larger and bolder than body text.
- Period filter: a row of four selectable chips: Today, 7 days, Month, Custom. Exactly one is active, and the active chip is visually emphasized against the others. Default is Today.
- Custom opens a date range picker; the chosen range becomes the active period.
- The filter applies to: the summary, your performance, and payment methods.
- The filter does not apply to: needs attention, the draft batches card, and the Outstanding now card.

### 4.2 Summary for Owner and Manager

**Gross profit block**

- Label “Gross profit”: small, secondary emphasis.
- Value: the largest and boldest text on the page. The currency code sits beside it, small and secondary.
- Change indicator beside or below the value: small, with a trend icon and a short comparison such as “12% vs yesterday”. It takes a positive or negative tone depending on direction. The comparison is against the previous period of the same length. When there is no previous value to compare with, the indicator is hidden.
- sSparkline below: a simple trend line of gross profit across the period, with no axes, gridlines, or labels. It stretches to the width of the block.

**Metric cards (two by two)**

Every card has the same anatomy: a small secondary label, a larger bold value, and a smallest muted subline. Cards have equal size within the grid.

| Card            | Subline                     | Responds to period | Tap destination                 |
| --------------- | --------------------------- | ------------------ | ------------------------------- |
| Sales           | Number of sales             | Yes                | Sales list for the period       |
| Cash collected  | Number of payments received | Yes                | Payments list for the period    |
| Outstanding now | Amount older than 7 days    | No (snapshot)      | Unpaid sales list, oldest first |
| Losses          | Number of loss records      | Yes                | Loss records for the period     |

The Outstanding now card is labelled “now” so it reads as a snapshot sitting among period-based cards. Cash collected shows all payments received within the period; its subline is a plain count and does not split the total by sale date.

Grid order, reading left to right then top to bottom: Sales, Cash collected, Outstanding now, Losses.

### 4.3 Summary for Cashier and Server

- Replaces the entire Owner and Manager summary. No gross profit block, no Outstanding now, no Losses.
- Two metric cards, using the same card anatomy as above: Sales (with sale count as the subline) and Cash collected (with payment count as the subline).
- Figures are shop-wide totals for the selected period. Personal figures are shown in Your performance.
- The two cards sit side by side at every width. At md and above they span the full summary row.

### 4.4 Needs attention

**Alert list**

- Section heading: small, secondary emphasis, above the list.
- One grouped container holding up to four rows, with a divider between rows. Rows are tappable and each opens a list already filtered to that condition.
- Row anatomy, left to right: a leading icon tile, a text block, a trailing chevron.
  - Icon tile: a small rounded square, toned by urgency.
  - Text block: a primary line (medium weight) stating the count and the condition, and a secondary line (smaller, secondary emphasis) with detail.

| Row        | Primary line                          | Secondary line                                      | Tone          |
| ---------- | ------------------------------------- | --------------------------------------------------- | ------------- |
| Low stock  | N products low or out of stock        | Names of the first two products, then “and N more”  | Urgent        |
| Expiry     | N lots expired or expiring in 30 days | The earliest-expiring product, and days left or ago | Caution       |
| Unpaid     | N unpaid sales                        | Total outstanding, and how many are overdue         | Caution       |
| Containers | N open containers                     | How many have been open longer than 14 days         | Informational |

The rows render counts and anchors only. Each tappable row opens the filtered list endpoint listed under the attention specification, where the full items are fetched.

**Draft batches card**

- A separate card placed directly below the list with a small gap. It is intentionally distinct from the list: it has a dashed outline instead of a filled surface, and it is not part of the grouped container.
- Anatomy: a leading icon tile (informational tone), a text block, and a trailing text action “Continue” with an arrow.
  - Primary line: N draft stock batches.
  - Secondary line: supplier and age of the oldest draft.
- The whole card is tappable and opens the filtered draft stock batch list.
- The card is hidden when there are no drafts and for staff roles, who cannot open stock intake.

The alert list and draft batches card always show current state and ignore the period filter.

### 4.5 Your performance

- Section heading: small, secondary emphasis.
- One card, with more internal padding than the metric cards.
- Top of the card: a small role badge showing the signed-in user's role name.
- Below the badge: label “Your sales” (small, secondary), then the sales total as a large bold value, larger than the metric card values but smaller than the gross profit value.
- Below the value: three rows, each with a divider above it, label at the start in secondary emphasis and value at the end in normal emphasis:
  - Sales count
  - Cash collected by you
  - Unpaid sales you made in this period
- “You” means the signed-in member: sales you processed or are attributed to as the server, and payments you recorded.
- Responds to the period filter.
- Identical for every role. Each person sees only their own figures. There is no team view in this version.

### 4.6 Payment methods

- Section heading, then one card.
- One block per payment method used in the period, largest first. Each block has the method name at the start, the amount received at the end in secondary emphasis, and beneath them a thin horizontal bar showing that method's share of the total. All bars share one tone, and the bar track spans the card's inner width.
- Methods with no payments in the period are not shown.
- Responds to the period filter.

## 5. Role visibility

| Element                  | Owner | Manager | Cashier | Server |
| ------------------------ | ----- | ------- | ------- | ------ |
| Header and period filter | Yes   | Yes     | Yes     | Yes    |
| Gross profit block       | Yes   | Yes     | No      | No     |
| Sales card               | Yes   | Yes     | Yes     | Yes    |
| Cash collected card      | Yes   | Yes     | Yes     | Yes    |
| Outstanding now card     | Yes   | Yes     | No      | No     |
| Losses card              | Yes   | Yes     | No      | No     |
| Needs attention counts   | Yes   | Yes     | Yes     | Yes    |
| Draft batches card       | Yes   | Yes     | No      | No     |
| Your performance         | Yes   | Yes     | Yes     | Yes    |
| Payment methods          | Yes   | Yes     | Yes     | Yes    |

The Sales and Cash collected cards are the same components for every role. For Owner and Manager they sit inside the two-by-two grid; for Cashier and Server they are the whole summary. No role sees cost or margin outside the gross profit block.

## 6. States (proposed)

- Loading: placeholders hold the exact footprint of each card and row so nothing shifts when data arrives.
- Period with no activity: values show zero, the sparkline is replaced by a flat or empty line, the change indicator is hidden, and the Payment methods card shows a short “No sales in this period” message.
- Needs attention with nothing to flag: alert rows with a zero count are hidden. If every row is hidden and there are no drafts, show a single short “All clear” message in place of the list.

## 7. Open items

- Gross profit sparkline on the Today period: hourly points, or hide the sparkline when data is too sparse.
