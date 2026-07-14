# Pondo Household Expense Tracker - Cloud Migration

This directory contains all the files needed to deploy the Pondo application to Vercel with Supabase as the database backend.

## Contents

1. **07-DEPLOYMENT-GUIDE.md** - Complete step-by-step deployment instructions
2. **vercel.json** - Vercel deployment configuration
3. **.env.example** - Environment variables template
4. **server/db/migration.sql** - Supabase PostgreSQL database schema and initial data
5. **scripts/migrate-data.js** - Script to migrate existing SQLite data to Supabase
6. **api/index.js** - Vercel serverless function entry point
7. **server/server.js** - Express application (modified for serverless deployment)
8. **server/db/supabase.js** - Supabase client initialization

## Deployment Overview

The application is configured to:
- Host the frontend on Vercel static hosting
- Run the backend API as Vercel serverless functions
- Use Supabase PostgreSQL for data storage
- Be accessible via the custom domain ginovalera.com

## Next Steps

Follow the instructions in 07-DEPLOYMENT-GUIDE.md to complete the deployment process.