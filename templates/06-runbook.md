# Deployment Runbook
**Project:** <name> · **Author:** devops · **Version:** 0.1 · **Date:** <date> · **Gate:** G7 (HARD — go-live)

## 1. Deployment target
<localhost / Docker host / VPS / etc.>

## 2. Build & run
```bash
docker compose build
docker compose up -d
docker compose ps        # verify healthy
```
Health check: `GET /api/health` → 200

## 3. Configuration & secrets
| Var | Where set | Notes |
|-----|-----------|-------|
| OLLAMA_API_KEY | host env / secrets store | never in image or repo |
| DB_PATH | compose volume | persisted |

## 4. Start / stop
```bash
docker compose up -d      # start
docker compose down       # stop (keeps volume)
docker compose logs -f    # tail logs
```

## 5. Backup & restore (SQLite)
- Backup (scheduled): `cp $DB_PATH backups/app-$(date +%F).db` (cron/daily)
- Restore: stop app → replace DB file from backup → start app
- **Restore tested?** ☐ yes

## 6. Rollback
- Redeploy previous image tag: `docker compose up -d <service>@<prev-tag>`
- If schema changed: restore matching DB backup
- **Rollback tested?** ☐ yes

## 7. Monitoring & logging
- App logs: structured JSON to stdout (captured by `docker logs`)
- Health endpoint monitored: <how/where>
- Alert on: container down, health check failing

## 8. Go-live checklist (G7)
- [ ] Container builds + runs (verified)
- [ ] Secrets externalized
- [ ] Backup scheduled + restore tested
- [ ] Rollback tested
- [ ] Logging + health check live
- [ ] **Awaiting Gino approval — do not deploy to prod until approved**

**Gino go-live sign-off (G7):** ____ on ____ · Deploy confirmed: ____
