// US-32 (3) — system.js route handlers, valid + invalid payload per handler.
// system.js talks to db/supabase directly (for the `users` table count) in
// addition to db/queries, so both are mocked here.
const request = require('supertest');

jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
});

const mockQueries = {
  getSetting: jest.fn(),
  setSetting: jest.fn(),
  getAccounts: jest.fn(),
  getCategories: jest.fn(),
  createAccount: jest.fn(),
  getEntryCount: jest.fn(),
  getCategoryById: jest.fn(),
  getAllSettings: jest.fn(),
  createCategory: jest.fn(),
};

jest.mock('../db/queries', () => mockQueries);

const mockSupabaseSelect = jest.fn();
jest.mock('../db/supabase', () => ({
  from: jest.fn(() => ({
    select: mockSupabaseSelect,
  })),
}));

describe('routes/system.js', () => {
  let app;

  beforeAll(() => {
    app = require('../server');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseSelect.mockResolvedValue({ count: 0, error: null });
  });

  describe('GET /api/status (system.js router.get(\'/status\'), mounted at app.use(\'/api\', systemRouter))', () => {
    it('valid: returns 200 with first-launch flags', async () => {
      mockQueries.getSetting.mockResolvedValue(null);
      mockQueries.getAccounts.mockResolvedValue([]);
      mockQueries.getEntryCount.mockResolvedValue(0);
      const res = await request(app).get('/api/status');
      expect(res.status).toBe(200);
      expect(res.body.first_launch).toBe(true);
    });

    it('edge case: app already set up (accounts + entries exist), returns 200 with first_launch=false', async () => {
      // GET /api/system/status takes no input — there's no malformed
      // "payload" to send. The meaningful second case is the opposite
      // system state (already onboarded), which must still be a clean 200.
      mockQueries.getSetting.mockResolvedValue('1');
      mockQueries.getAccounts.mockResolvedValue([{ id: 1 }]);
      mockQueries.getEntryCount.mockResolvedValue(5);
      mockSupabaseSelect.mockResolvedValue({ count: 1, error: null });
      const res = await request(app).get('/api/status');
      expect(res.status).toBe(200);
      expect(res.body.first_launch).toBe(false);
      expect(res.body.has_accounts).toBe(true);
      expect(res.body.has_entries).toBe(true);
    });
  });

  describe('GET /api/settings', () => {
    it('valid: returns 200 with filtered settings', async () => {
      mockQueries.getAllSettings.mockResolvedValue({ last_used_account_id: '1', first_launch_completed: '1' });
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body.last_used_account_id).toBe('1');
    });

    it('edge case: no settings stored yet, returns 200 with an empty object', async () => {
      mockQueries.getAllSettings.mockResolvedValue({});
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });
  });

  describe('PUT /api/settings', () => {
    it('valid: updates last_used_account_id, returns 200', async () => {
      mockQueries.setSetting.mockResolvedValue();
      mockQueries.getAllSettings.mockResolvedValue({ last_used_account_id: '2' });
      const res = await request(app).put('/api/settings').send({ last_used_account_id: 2 });
      expect(res.status).toBe(200);
    });

    it('invalid: non-integer last_used_account_id returns 400', async () => {
      const res = await request(app).put('/api/settings').send({ last_used_account_id: 'not-a-number' });
      expect(res.status).toBe(400);
    });
  });
});
