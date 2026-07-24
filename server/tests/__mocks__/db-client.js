// Manual test mock for server/db/client.js (the raw Supabase client).
//
// Wired in via jest.config.js's moduleNameMapper, not a per-file jest.mock,
// because this file is required directly only by
// server/middleware/error-handler.js (US-28, v1.4) — every route's own
// Supabase access goes through server/db/queries.js, which every existing
// route test file already mocks wholesale via jest.mock('../db/queries').
// Without this stub, every error response produced anywhere in the test
// suite (400/404/409/500 — there are many) would trigger a real network
// call to the fake project URL set in tests/setup.js.
module.exports = {
  from: () => ({
    insert: () => Promise.resolve({ data: null, error: null }),
  }),
};
