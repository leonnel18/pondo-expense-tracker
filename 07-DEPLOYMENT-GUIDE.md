# Pondo Household Expense Tracker — Deployment Guide

This guide provides step-by-step instructions for deploying the Pondo application to Vercel with Supabase as the database backend.

## Prerequisites

Before beginning the deployment process, ensure you have the following installed:

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **Vercel CLI**
   - Install globally: `npm install -g vercel`
   - Verify installation: `vercel --version`

3. **Supabase Account**
   - Sign up at: https://supabase.com/
   - You'll need access to the project at: https://csuadlwjhxelwjjgzajb.supabase.co

4. **Cloudflare Account** (for custom domain setup)
   - Sign up at: https://www.cloudflare.com/

## Supabase Setup

1. **Create Database Tables**
   - Navigate to your Supabase project dashboard
   - Go to SQL Editor
   - Run the SQL from `server/db/migration.sql` to create the required tables and seed default categories

2. **Seed Default Categories**
   - The default categories are already included in the migration.sql file and will be created when you run it.

3. **Get Connection Strings**
   - Navigate to Project Settings → API
   - Note down the following values:
     - Project URL (SUPABASE_URL)
     - anon public (SUPABASE_ANON_KEY)
     - service_role_secret (SUPABASE_SERVICE_ROLE_KEY)

## Environment Variables

Set the following environment variables in your Vercel project settings:

```
SUPABASE_URL=https://csuadlwjhxelwjjgzajb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase
SUPABASE_ANON_KEY=your_anon_key_from_supabase
BCRYPT_SALT_ROUNDS=12
```

## Vercel Deployment

### Option A: Vercel CLI Deployment

1. **Install dependencies**
   ```bash
   cd server
   npm install
   cd ../client
   npm install
   ```

2. **Build the frontend**
   ```bash
   npm run build
   ```

3. **Deploy to Vercel**
   ```bash
   # From the project root
   vercel deploy
   ```

4. **Follow the prompts**
   - Set up and deploy? Yes
   - Which scope? Your personal account or team
   - Link to existing project? No (create new)
   - What's your project's name? pondo
   - In which directory is your code located? ./
   - Want to override the settings? No

5. **Set environment variables**
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add SUPABASE_ANON_KEY
   vercel env add BCRYPT_SALT_ROUNDS
   ```

### Option B: Git-based Deployment

1. **Push code to GitHub/GitLab**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com/dashboard
   - Click "New Project"
   - Import your Git repository
   - Configure project settings:
     - Framework Preset: Vite
     - Root Directory: ./
     - Build Command: npm run build
     - Output Directory: dist
     - Install Command: npm install

3. **Add environment variables**
   - In Vercel project settings → Environment Variables
   - Add all required environment variables listed above

## Domain Setup

1. **Configure Cloudflare DNS**
   - Log in to your Cloudflare dashboard
   - Select your domain (ginovalera.com)
   - Go to DNS settings
   - Add a CNAME record:
     - Name: @ (or www if you prefer)
     - Target: cname.vercel-dns.com
     - Proxy status: Proxied

2. **Add Domain to Vercel**
   - In your Vercel project dashboard
   - Go to Settings → Domains
   - Add your domain: ginovalera.com
   - Vercel will automatically provision an SSL certificate

## Data Migration (if migrating from SQLite)

If you have existing data in SQLite that you want to migrate to Supabase:

1. **Ensure you have the SQLite database file**
   - The file should be located at `server/data/pondo.db`

2. **Run the migration script**
   ```bash
   # From the project root
   node scripts/migrate-data.js
   ```

3. **Verify the migration**
   - Check the console output for success messages
   - Verify data in Supabase dashboard

## Verification

After deployment, perform these smoke tests to ensure everything is working correctly:

1. **Visit your domain**
   - Navigate to ginovalera.com
   - Verify that the dashboard loads correctly

2. **Test basic functionality**
   - Create a new entry and verify it appears in the list
   - Set a passphrase and verify locking/unlocking works
   - Try exporting data to CSV and verify the download works

3. **Check API endpoints**
   - Visit `/api/health` and verify you get a 200 response with status OK

## Rollback Plan

If something goes wrong after deployment, you can roll back using these steps:

1. **Revert to previous deployment**
   - In Vercel dashboard, go to your project
   - Click on "Deployments" tab
   - Find the previous working deployment
   - Click the "..." menu and select "Rollback"

2. **Restore database (if needed)**
   - If you have a database backup, restore it through Supabase dashboard
   - Navigate to Table Editor → Restore
   - Upload your backup file

3. **Revert code changes**
   - If using Git, revert to the previous commit:
     ```bash
     git reset --hard HEAD~1
     git push --force-with-lease
     ```

4. **Contact support**
   - If you're unable to resolve the issue, contact Vercel or Supabase support

## Next Steps

Once deployment is complete and verified:

1. Update any bookmarks or references to the new domain
2. Share the URL with household members if needed
3. Set up monitoring for uptime and performance
4. Schedule regular database backups
5. Review and update this deployment guide as needed for future deployments