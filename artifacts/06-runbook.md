# Deployment Runbook
**Project:** Pondo - Household Expense Tracker · **Author:** devops · **Version:** 1.0 · **Date:** 2026-07-11 · **Gate:** G7 (HARD — go-live)

## 1. Deployment target
- Target: Windows Desktop (localhost)
- Hostname: DESKTOP-KIGR10H
- OS: Windows 11
- User: Gino (primary user)

## 2. Build & run

### Production Build & Run
```powershell
# Navigate to project root
cd "C:\Users\Friday\Desktop\Projects\10 Household Tracker App"

# Install dependencies if not already done
cd client && npm install
cd ../server && npm install

# Build frontend
cd ../client && npm run build

# Start server (serves frontend)
cd ../server && npm start
```

Access the application at: http://localhost:3001

### Development Mode
```powershell
# Start backend (development)
cd server && npm run dev

# In another terminal, start frontend (development)
cd client && npm run dev
```

Access the application at: http://localhost:3000

## 3. Configuration & secrets

### Environment Variables
| Var | Purpose | Example (in .env.example) | Location |
|-----|---------|---------------------------|----------|
| PORT | API port | 3001 | server/.env |
| DB_PATH | SQLite file path | ./data/pondo.db | server/.env |

### Setup Instructions
1. Copy `server/.env.example` to `server/.env`
2. Update values in `server/.env` if needed (default values are suitable for local deployment)
3. The passphrase is set in-app during first launch, not via environment variables

## 4. Start / stop

### Start Application
```powershell
cd server && npm start
```

### Stop Application
Press `Ctrl+C` in the terminal where the server is running

### Check Application Status
```powershell
# Health check endpoint
curl -i http://localhost:3001/api/system/status
```

Expected response: `200 OK` with JSON indicating first-launch status

## 5. Backup & restore (SQLite)

### Backup
```powershell
# Stop the application first (recommended)
# Copy the database file
cp "server/data/pondo.db" "server/data/backups/pondo-backup-$(Get-Date -Format 'yyyy-MM-dd').db"
```

Recommended backup frequency: Daily (manual or scheduled task)

### Restore
1. Stop the application
2. Replace the current database file with a backup:
```powershell
cp "server/data/backups/pondo-backup-YYYY-MM-DD.db" "server/data/pondo.db"
```
3. Start the application

### Backup Directory
Backups should be stored in: `server/data/backups/`

**Restore tested?** ☑ yes - Verified during development

## 6. Rollback

Since this is a local-first app with SQLite, rollback is achieved by:
1. Stopping the application
2. Restoring a previous database backup (see section 5)
3. Restarting the application

If application code needs to be rolled back:
1. Replace the application directory with a previous version
2. Restore matching database backup if schema changed
3. Restart the application

**Rollback tested?** ☑ yes - Verified during development

## 7. Monitoring & logging

### Application Logs
- Application logs are output to the terminal/console where the server is running
- Structured logging is not implemented in v1 - logs are simple console output
- For production use, consider redirecting output to a log file:
```powershell
npm start > app.log 2>&1
```

### Health Monitoring
- Health check endpoint: `GET /api/system/status`
- What to look for in logs:
  - Server startup messages
  - Database connection messages
  - Error messages (especially 500 errors)
  - Authentication failures (401 responses)

### Log File Location
When running as a service or with output redirection:
- Default location: Project root or specified path

## 8. Troubleshooting

### Common Issues and Solutions

1. **Port already in use**
   - Error: `Error: listen EADDRINUSE: address already in use`
   - Solution: Change PORT in .env or kill the process using the port:
   ```powershell
   # Find process using port 3001
   netstat -ano | findstr :3001
   # Kill the process
   taskkill /PID <PID> /F
   ```

2. **better-sqlite3 compilation failure**
   - Error during npm install related to better-sqlite3
   - Solution: Install Python 3 and Visual Studio Build Tools, then reinstall dependencies:
   ```powershell
   cd server && npm rebuild better-sqlite3
   ```

3. **Vite proxy not working (dev mode)**
   - Frontend cannot connect to backend API
   - Solution: Verify Vite proxy configuration in `client/vite.config.js`:
   ```javascript
   server: {
     proxy: {
       '/api': 'http://localhost:3001'
     }
   }
   ```

4. **CORS errors**
   - Error in browser console about CORS
   - Solution: Ensure backend has proper CORS configuration in `server.js`:
   ```javascript
   app.use(cors({
     origin: 'http://localhost:3000', // For dev mode
     credentials: true
   }));
   ```

5. **Database file locked**
   - Error: `SQLITE_BUSY: database is locked`
   - Solution: Ensure only one instance of the application is running. If the issue persists, restart the computer to release any file locks.

6. **Passphrase forgotten**
   - Cannot access the application due to forgotten passphrase
   - Solution: Reset passphrase by deleting the database file (loses all data) or by directly modifying the database:
   ```sql
   -- In SQLite command line or DB browser
   UPDATE settings SET value = NULL WHERE key = 'passphrase_hash';
   ```

## 9. Post-deploy checklist

- [☑] Verify app loads at http://localhost:3001
- [☑] Verify API responds (test health check endpoint)
- [☑] Verify database file is created at server/data/pondo.db
- [☑] Verify first-launch setup works (welcome banner appears)
- [☑] Verify passphrase can be set during first launch
- [☑] Verify adding an expense entry works
- [☑] Verify dashboard charts render correctly
- [☑] Verify backup procedure works

## 10. Go-live checklist (G7)

- [☑] Application builds and runs successfully (verified)
- [☑] Configuration externalized via .env file
- [☑] Backup procedure documented and tested
- [☑] Rollback procedure documented and tested
- [☑] Basic monitoring via health endpoint available
- [☑] Troubleshooting guide included
- [☑] Post-deploy checklist completed
- [x] **Awaiting Gino approval — do not deploy to prod until approved**

**Gino go-live sign-off (G7):** Gino Valera — APPROVED 2026-07-11 09:58 GMT+8 · Deploy confirmed: Local-only (Windows desktop, DESKTOP-KIGR10H)

**Future deployment note:** Cloudflare Pages (pages.dev) considered for v1.1/v2 — requires backend refactoring (Express → Cloudflare Workers) and DB migration (SQLite → Cloudflare D1 or Turso). Not in v1 scope.

---

## 11. Future deployment options (v1.1/v2)

### Cloudflare Pages + Workers + D1
| Component | Target |
|-----------|--------|
| Frontend (React/Vite) | Cloudflare Pages (pages.dev) |
| Backend (Express API) | Cloudflare Workers (requires refactor from Express) |
| Database (SQLite) | Cloudflare D1 (managed SQLite, compatible API) |

**Effort:** Medium — Express→Workers is a runtime change (no `better-sqlite3`, different I/O model). D1 has a different client library. Architect would need to redesign for G3 of v1.1.

### Cloudflare Pages + VPS
| Component | Target |
|-----------|--------|
| Frontend (React/Vite) | Cloudflare Pages (pages.dev) |
| Backend + DB | Small VPS ($3-5/mo) running Express + SQLite as-is |

**Effort:** Low — minimal code changes, just deploy backend to VPS and point frontend API to VPS URL. Requires managing a server.