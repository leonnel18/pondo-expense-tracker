# Solution Architecture Document (SAD)
**Project:** <name> · **Author:** architect · **Version:** 0.1 · **Date:** <date> · **Gate:** G3 (HARD)

## 1. Stack decision
| Layer | Choice | Justification (vs NFRs) |
|-------|--------|-------------------------|
| Frontend | React + Vite + Tailwind | |
| Charts | Recharts / Chart.js | |
| Backend | Node + Express | |
| Data | SQLite (better-sqlite3) | |
| Auth | JWT / none (MVP) | |
| AI (opt) | Ollama cloud: <model> | fallback: <model> |

**Key tradeoffs for Gino:** <e.g. SQLite vs Postgres if multi-household>

## 2. Data model
```
income(id PK, source, amount, date, category_id FK, notes, created_at)
expense(id PK, amount, date, category_id FK, payment_method, notes, created_at)
category(id PK, name, type[income|expense], color)
household(id PK, name)            -- if multi-household
```
| Entity | Field | Type | Constraints | Notes |
|--------|-------|------|-------------|-------|
| | | | | |

Relationships, indexes, constraints: <describe>

## 3. API contract
| Method | Path | Request | Response | Codes | Validation |
|--------|------|---------|----------|-------|-----------|
| GET | /api/expenses?from&to&category | — | Expense[] | 200 | |
| POST | /api/expenses | {amount,date,category_id,...} | Expense | 201/400 | amount>0, valid date |
| PUT | /api/expenses/:id | {...} | Expense | 200/404 | |
| DELETE | /api/expenses/:id | — | — | 204/404 | |
| GET | /api/income | … | … | | |
| GET | /api/summary?from&to | — | {income,expense,balance} | 200 | |
| GET | /api/breakdown?from&to | — | [{category,total}] | 200 | |
_(income + categories endpoints mirror the above)_

## 4. Business / aggregation logic
- **Balance** = Σ income − Σ expense over [from,to]
- **Category breakdown** = Σ expense grouped by category over [from,to]
- **Month-over-month** = compare current vs previous period totals
- Edge rules: reject amount ≤ 0; date required; deleting a category with entries → <block/reassign>

## 5. NFR design
Auth: <> · Input validation: <> · Error handling: <consistent {error} shape + codes> · Backup: <SQLite file backup> · AI integration: <what/how/model/fallback>

## 6. Requirement traceability (FR → design)
| FR | Endpoint(s) / table(s) / component |
|----|-----------------------------------|
| FR-1 | |

## 7. Build order (for dev)
1. Schema + migrations 2. CRUD endpoints 3. Aggregation endpoints 4. Frontend scaffold 5. Dashboard 6. Forms 7. Charts

## 8. Risks / decisions for G3
-

## 9. Sign-off
- Approved by Gino at G3 on: ____ · Notes: ____
