// US-32 (3) — recycle-bin.js route handlers, valid + invalid payload per handler.
const request = require('supertest');

jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
});

const mockQueries = {
  getRecycleBin: jest.fn(),
  restoreItem: jest.fn(),
  purgeExpired: jest.fn(),
};

jest.mock('../db/queries', () => mockQueries);

describe('routes/recycle-bin.js', () => {
  let app;

  beforeAll(() => {
    app = require('../server');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueries.purgeExpired.mockResolvedValue({ purged_accounts: 0, purged_entries: 0 });
  });

  describe('GET /api/recycle-bin', () => {
    it('valid: returns 200', async () => {
      mockQueries.getRecycleBin.mockResolvedValue({ items: [], total: 0 });
      const res = await request(app).get('/api/recycle-bin');
      expect(res.status).toBe(200);
    });

    it('invalid: unsupported ?type value still returns 200 (no crash)', async () => {
      mockQueries.getRecycleBin.mockResolvedValue({ items: [], total: 0 });
      const res = await request(app).get('/api/recycle-bin').query({ type: 'bogus' });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/recycle-bin/restore/:type/:id', () => {
    it('valid: restores an entry, returns 200', async () => {
      mockQueries.restoreItem.mockResolvedValue({ restored: true });
      const res = await request(app).post('/api/recycle-bin/restore/entries/1');
      expect(res.status).toBe(200);
    });

    it('invalid: unsupported type returns 400', async () => {
      const res = await request(app).post('/api/recycle-bin/restore/bogus-type/1');
      expect(res.status).toBe(400);
    });
  });

  describe('GET+POST /api/recycle-bin/purge', () => {
    it('valid: correct X-API-Key returns 200', async () => {
      const res = await request(app).get('/api/recycle-bin/purge').set('X-API-Key', 'test-purge-api-key');
      expect(res.status).toBe(200);
    });

    it('invalid: missing/incorrect credentials returns 401', async () => {
      const res = await request(app).get('/api/recycle-bin/purge');
      expect(res.status).toBe(401);
    });
  });
});
