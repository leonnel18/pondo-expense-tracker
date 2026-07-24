// US-32 (3) — GET/POST/PUT/DELETE /api/accounts + /api/accounts/:id/reconcile
// return non-500 for at least one valid and one invalid payload each.
const request = require('supertest');

jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
});

const mockQueries = {
  getAccounts: jest.fn(),
  getAccountById: jest.fn(),
  createAccount: jest.fn(),
  updateAccount: jest.fn(),
  deleteAccount: jest.fn(),
  deleteEntriesByAccount: jest.fn(),
  getAccountBalance: jest.fn(),
  getBalanceAdjustmentCategory: jest.fn(),
  createEntry: jest.fn(),
  logAppEvent: jest.fn(),
};

jest.mock('../db/queries', () => mockQueries);

describe('routes/accounts.js', () => {
  let app;

  beforeAll(() => {
    app = require('../server');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueries.logAppEvent.mockResolvedValue();
  });

  describe('GET /api/accounts', () => {
    it('valid: returns 200 with the account list', async () => {
      mockQueries.getAccounts.mockResolvedValue([{ id: 1, name: 'Wallet', type: 'debit' }]);
      const res = await request(app).get('/api/accounts');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('invalid: unsupported ?sort value does not crash (falls back to default sort), returns 200', async () => {
      // GET / has no validate() schema, so bogus query params reach the
      // handler directly — the "invalid" case here is confirming that
      // doesn't 500, not a 400 (there's nothing to reject).
      mockQueries.getAccounts.mockResolvedValue([]);
      const res = await request(app).get('/api/accounts').query({ sort: 'not-a-real-sort-field' });
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/accounts/:id', () => {
    it('valid: existing account returns 200', async () => {
      mockQueries.getAccountById.mockResolvedValue({ id: 1, name: 'Wallet', type: 'debit' });
      mockQueries.getAccountBalance.mockResolvedValue(500);
      const res = await request(app).get('/api/accounts/1');
      expect(res.status).toBe(200);
      expect(res.body.balance).toBe(500);
    });

    it('invalid: nonexistent account returns 404', async () => {
      mockQueries.getAccountById.mockResolvedValue(null);
      const res = await request(app).get('/api/accounts/999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/accounts', () => {
    it('valid: creates account, returns 201', async () => {
      mockQueries.createAccount.mockResolvedValue({ id: 1, name: 'Wallet', type: 'debit' });
      const res = await request(app)
        .post('/api/accounts')
        .send({ name: 'Wallet', type: 'debit' });
      expect(res.status).toBe(201);
    });

    it('invalid: missing required fields returns 400', async () => {
      const res = await request(app).post('/api/accounts').send({ name: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/accounts/:id', () => {
    it('valid: updates existing account, returns 200', async () => {
      mockQueries.getAccountById.mockResolvedValue({ id: 1, name: 'Wallet', type: 'debit', description: null, emoji: null });
      mockQueries.updateAccount.mockResolvedValue({ id: 1, name: 'New Name', type: 'debit' });
      const res = await request(app).put('/api/accounts/1').send({ name: 'New Name' });
      expect(res.status).toBe(200);
    });

    it('invalid: nonexistent account returns 404', async () => {
      mockQueries.getAccountById.mockResolvedValue(null);
      const res = await request(app).put('/api/accounts/999').send({ name: 'New Name' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('valid: deletes existing account, returns 200', async () => {
      mockQueries.getAccountById.mockResolvedValue({ id: 1, name: 'Wallet' });
      mockQueries.deleteAccount.mockResolvedValue({ id: 1, deleted_at: '2026-01-01T00:00:00Z' });
      mockQueries.deleteEntriesByAccount.mockResolvedValue({ soft_deleted: 2 });
      const res = await request(app).delete('/api/accounts/1');
      expect(res.status).toBe(200);
      expect(res.body.entries_soft_deleted).toBe(2);
    });

    it('invalid: nonexistent account returns 404', async () => {
      mockQueries.getAccountById.mockResolvedValue(null);
      const res = await request(app).delete('/api/accounts/999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/accounts/:id/reconcile', () => {
    it('valid: reconciles with no delta, returns 200', async () => {
      mockQueries.getAccountById.mockResolvedValue({ id: 1, type: 'debit' });
      mockQueries.getAccountBalance.mockResolvedValue(100);
      const res = await request(app).post('/api/accounts/1/reconcile').send({ actual_balance: 100 });
      expect(res.status).toBe(200);
      expect(res.body.adjustment_created).toBe(false);
    });

    it('invalid: non-numeric actual_balance returns 400', async () => {
      const res = await request(app).post('/api/accounts/1/reconcile').send({ actual_balance: 'not-a-number' });
      expect(res.status).toBe(400);
    });
  });
});
