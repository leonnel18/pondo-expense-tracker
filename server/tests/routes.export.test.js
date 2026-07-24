// US-32 (3) — export.js route handlers, valid + invalid payload per handler.
const request = require('supertest');

jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
});

const mockQueries = {
  getEntriesForExport: jest.fn(),
  getAccountsForExport: jest.fn(),
  logAppEvent: jest.fn(),
};

jest.mock('../db/queries', () => mockQueries);

describe('routes/export.js', () => {
  let app;

  beforeAll(() => {
    app = require('../server');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueries.logAppEvent.mockResolvedValue();
  });

  describe('GET /api/export/entries', () => {
    it('valid: no date range, returns 200 CSV', async () => {
      mockQueries.getEntriesForExport.mockResolvedValue([
        { id: 1, type: 'expense', amount: 100, date: '2020-01-01', category_name: 'Food', account_name: 'Wallet', note: '', created_at: '', updated_at: '', pending: false, tags: '' },
      ]);
      const res = await request(app).get('/api/export/entries');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
    });

    it('invalid: from > to returns 400', async () => {
      const res = await request(app).get('/api/export/entries').query({ from: '2020-02-01', to: '2020-01-01' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/export/accounts', () => {
    it('valid: returns 200 CSV', async () => {
      mockQueries.getAccountsForExport.mockResolvedValue([{ id: 1, name: 'Wallet', type: 'debit', description: '' }]);
      const res = await request(app).get('/api/export/accounts');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
    });

    it('invalid: unsupported query param is ignored, still returns 200', async () => {
      mockQueries.getAccountsForExport.mockResolvedValue([]);
      const res = await request(app).get('/api/export/accounts').query({ bogus: 'param' });
      expect(res.status).toBe(200);
    });
  });
});
