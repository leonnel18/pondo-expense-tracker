# Code Documentation
**Project:** <name> · **Author:** dev · **Version:** 0.1 · **Date:** <date> · **Gate:** G5 (soft)

## 1. How to run
```bash
# backend
cd server && cp .env.example .env && npm install && npm run dev
# frontend
cd client && npm install && npm run dev
```
App URL: <http://localhost:...>

## 2. Project structure
```
/server   Express API, DB, migrations
/client   Vite + React + Tailwind
```
| Path | Purpose |
|------|---------|
| server/db | schema + queries |
| server/routes | endpoints |
| client/src/pages | screens |
| client/src/components | UI components |

## 3. Environment variables
| Var | Purpose | Example (in .env.example) |
|-----|---------|---------------------------|
| PORT | API port | 3001 |
| DB_PATH | SQLite file | ./data/app.db |
| OLLAMA_API_KEY | cloud model auth | (never commit) |

## 4. API implemented (vs SAD)
| Endpoint | Status | Notes / deviations |
|----------|--------|--------------------|
| | | |

## 5. FR → implementation map
| FR | Where implemented |
|----|-------------------|
| FR-1 | |

## 6. Known deviations from SAD (with reason)
-

## 7. Build verification
- [ ] `npm run build` passes (backend + frontend)
- [ ] App starts and endpoints respond (exec-verified)
- [ ] No secrets committed
