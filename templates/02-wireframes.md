# Wireframe & UI Spec
**Project:** <name> · **Author:** ux · **Version:** 0.1 · **Date:** <date> · **Gate:** G2 (soft)

## 1. Screen inventory
| Screen | Purpose | BRD FRs covered |
|--------|---------|-----------------|
| Dashboard | KPIs + charts overview | |
| Transactions | List + filter income/expenses | |
| Add / Edit entry | Form | |
| Categories | Manage categories | |

## 2. User flows
**Hero flow — add an expense:**
1. …
**Other flows:** log income · filter by month · edit/delete entry · set category

## 3. Wireframes (low-fi)
### Dashboard
```
+--------------------------------------------------+
| Header: Household name        [Month filter ▾]   |
+-----------+-----------+-----------+--------------+
| Income    | Expenses  | Balance   | vs last mo   |  ← KPI cards
+-----------+-----------+-----------+--------------+
| [ Category breakdown  ]  | [ Income vs Expense  ]|  ← donut / bar
|        (donut)           |        (bar)          |
+--------------------------+-----------------------+
| Recent transactions (table, 5 rows) ...          |
+--------------------------------------------------+
```
_States: empty (no data yet) · loading · error._

### Add / Edit entry
```
Type: (•) Expense ( ) Income
Amount: [______]   Date: [____]   Category: [▾]
Payment method: [▾]   Notes: [__________]
[ Cancel ]                          [ Save ]
```
_(Repeat a block per screen: layout, components, data shown, states, mobile behavior.)_

## 4. Component inventory
Buttons · text/number/date inputs · select · KPI card · data table · donut chart · bar chart · modal/confirm.

## 5. Chart decisions
| Chart | Where | Why |
|-------|-------|-----|
| Donut | category breakdown | part-to-whole |
| Bar | income vs expense over time | comparison across periods |

## 6. FR coverage check
Every BRD FR maps to a screen/component above? ☐ yes — list any gaps: ____

## 7. UX notes / open items for Gino
-
