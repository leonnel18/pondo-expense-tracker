// Jest global setup — runs before each test file's module registry loads.
//
// NODE_ENV=production is intentional here (not a typo): server.js only
// guards its own `app.listen()` call behind `NODE_ENV !== 'production'`
// (see server.js line ~76). supertest doesn't need a real listener — it
// binds its own ephemeral port per request — so leaving NODE_ENV at its
// default would make every test file that requires server.js also start a
// real HTTP server on the same PORT, causing EADDRINUSE across test files
// and leaving open handles that hang Jest. Setting it to 'production' here
// only affects this test run, not the deployed app.
process.env.NODE_ENV = 'production';

// Dummy-but-well-formed Supabase config so server/db/supabase.js and
// server/lib/supabase-auth.js don't throw at require-time (both throw
// synchronously if SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are missing).
// createClient() only validates the URL shape at construction time — it
// makes no network call — so a fake project URL is sufficient offline.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

// Used by the /purge and /process cron-gated endpoints (recycle-bin.js,
// recurrences.js) so their "valid credentials" test cases have something
// to match against.
process.env.PURGE_API_KEY = process.env.PURGE_API_KEY || 'test-purge-api-key';
process.env.CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret';
