// US-32 (3) — entries.js route handlers, valid + invalid payload per handler.
const request = require('supertest');

jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
});

const mockQueries = {
  getEntries: jest.fn(),
  getEntryById: jest.fn(),
  createEntry: jest.fn(),
  updateEntry: jest.fn(),
  deleteEntry: jest.fn(),
  bulkDeleteEntries: jest.fn(),
  setSetting: jest.fn(),
  getCategoryById: jest.fn(),
  getAccountById: jest.fn(),
  getCalendarMonth: jest.fn(),
  confirmPendingEntry: jest.fn(),
  logAppEvent: jest.fn(),
};

jest.mock('../db/queries', () => mockQueries);

const VALID_ENTRY_BODY = {
  type: 'expense',
  amount: 100,
  account_id: 1,
  category_id: 2,
  date: '2020-01-01',
};

describe('routes/entries.js', () => {
  let app;

  beforeAll(() => {
    app = require('../server');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueries.logAppEvent.mockResolvedValue();
    mockQueries.setSetting.mockResolvedValue();
  });

  describe('GET /api/entries', () => {
    it('valid: returns 200', async () => {
      mockQueries.getEntries.mockResolvedValue([]);
      const res = await request(app).get('/api/entries');
      expect(res.status).toBe(200);
    });

    it('invalid: bad query param (type=bogus) returns 400', async () => {
      const res = await request(app).get('/api/entries').query({ type: 'bogus' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/entries/calendar', () => {
    it('valid: month=YYYY-MM returns 200', async () => {
      mockQueries.getCalendarMonth.mockResolvedValue({ days: [] });
      const res = await request(app).get('/api/entries/calendar').query({ month: '2020-01' });
      expect(res.status).toBe(200);
    });

    it('invalid: malformed month returns 400', async () => {
      const res = await request(app).get('/api/entries/calendar').query({ month: 'not-a-month' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/entries/:id', () => {
    it('valid: existing entry returns 200', async () => {
      mockQueries.getEntryById.mockResolvedValue({ id: 1, type: 'expense' });
      const res = await request(app).get('/api/entries/1');
      expect(res.status).toBe(200);
    });

    it('invalid: non-numeric id returns 400', async () => {
      const res = await request(app).get('/api/entries/abc');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/entries', () => {
    it('valid: creates an entry, returns 201', async () => {
      mockQueries.getCategoryById.mockResolvedValue({ id: 2, type: 'expense' });
      mockQueries.getAccountById.mockResolvedValue({ id: 1 });
      mockQueries.createEntry.mockResolvedValue({ id: 1, ...VALID_ENTRY_BODY });
      const res = await request(app).post('/api/entries').send(VALID_ENTRY_BODY);
      expect(res.status).toBe(201);
    });

    it('invalid: missing required fields returns 400', async () => {
      const res = await request(app).post('/api/entries').send({ type: 'expense' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/entries/:id', () => {
    it('valid: updates an existing entry, returns 200', async () => {
      mockQueries.getEntryById.mockResolvedValue({ id: 1, type: 'expense', category_id: 2, account_id: 1, date: '2020-01-01' });
      mockQueries.updateEntry.mockResolvedValue({ id: 1, amount: 200 });
      const res = await request(app).put('/api/entries/1').send({ amount: 200 });
      expect(res.status).toBe(200);
    });

    it('invalid: non-numeric id returns 400', async () => {
      const res = await request(app).put('/api/entries/abc').send({ amount: 200 });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/entries/:id', () => {
    it('valid: deletes an existing entry, returns 200', async () => {
      mockQueries.getEntryById.mockResolvedValue({ id: 1 });
      mockQueries.deleteEntry.mockResolvedValue({ id: 1, deleted_at: '2026-01-01T00:00:00Z' });
      const res = await request(app).delete('/api/entries/1');
      expect(res.status).toBe(200);
    });

    it('invalid: nonexistent entry returns 404', async () => {
      mockQueries.getEntryById.mockResolvedValue(null);
      const res = await request(app).delete('/api/entries/999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/entries/bulk-delete', () => {
    it('valid: array of ids returns 200', async () => {
      mockQueries.bulkDeleteEntries.mockResolvedValue({ deleted: 2 });
      const res = await request(app).post('/api/entries/bulk-delete').send({ ids: [1, 2] });
      expect(res.status).toBe(200);
    });

    it('invalid: missing ids returns 400', async () => {
      const res = await request(app).post('/api/entries/bulk-delete').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/entries/:id/confirm', () => {
    it('valid: confirms a pending entry, returns 200', async () => {
      mockQueries.getEntryById.mockResolvedValue({ id: 1, pending: true });
      mockQueries.confirmPendingEntry.mockResolvedValue({ id: 1, pending: false });
      const res = await request(app).post('/api/entries/1/confirm');
      expect(res.status).toBe(200);
    });

    it('invalid: nonexistent entry returns 404', async () => {
      mockQueries.getEntryById.mockResolvedValue(null);
      const res = await request(app).post('/api/entries/999/confirm');
      expect(res.status).toBe(404);
    });
  });
});
