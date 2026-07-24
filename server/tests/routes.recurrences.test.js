// US-32 (3) — recurrences.js route handlers, valid + invalid payload per handler.
const request = require('supertest');

jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
});

const mockQueries = {
  getRecurrences: jest.fn(),
  getRecurrenceById: jest.fn(),
  createRecurrence: jest.fn(),
  updateRecurrence: jest.fn(),
  deleteRecurrence: jest.fn(),
  archiveRecurrence: jest.fn(),
  restoreRecurrence: jest.fn(),
  getPendingConfirmationRecurrences: jest.fn(),
  processRecurrences: jest.fn(),
  confirmRecurrence: jest.fn(),
  getAccountById: jest.fn(),
  getCategoryById: jest.fn(),
};

jest.mock('../db/queries', () => mockQueries);

const VALID_RECURRENCE_BODY = {
  account_id: 1,
  category_id: 2,
  type: 'expense',
  amount: 100,
  mode: 'repeat',
  cycle: 'monthly',
  start_date: '2020-01-01',
};

describe('routes/recurrences.js', () => {
  let app;

  beforeAll(() => {
    app = require('../server');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/recurrences', () => {
    it('valid: returns 200', async () => {
      mockQueries.getRecurrences.mockResolvedValue([]);
      const res = await request(app).get('/api/recurrences');
      expect(res.status).toBe(200);
    });

    it('edge case: ?archived=true still returns 200', async () => {
      mockQueries.getRecurrences.mockResolvedValue([]);
      const res = await request(app).get('/api/recurrences').query({ archived: 'true' });
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/recurrences/due', () => {
    it('valid: returns 200', async () => {
      mockQueries.getPendingConfirmationRecurrences.mockResolvedValue([]);
      const res = await request(app).get('/api/recurrences/due');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/recurrences/:id', () => {
    it('valid: existing recurrence returns 200', async () => {
      mockQueries.getRecurrenceById.mockResolvedValue({ id: 1, ...VALID_RECURRENCE_BODY });
      const res = await request(app).get('/api/recurrences/1');
      expect(res.status).toBe(200);
    });

    it('invalid: nonexistent recurrence returns 404', async () => {
      mockQueries.getRecurrenceById.mockResolvedValue(null);
      const res = await request(app).get('/api/recurrences/999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/recurrences', () => {
    it('valid: creates a recurrence, returns 201', async () => {
      mockQueries.getAccountById.mockResolvedValue({ id: 1 });
      mockQueries.getCategoryById.mockResolvedValue({ id: 2, type: 'expense' });
      mockQueries.createRecurrence.mockResolvedValue({ id: 1, ...VALID_RECURRENCE_BODY });
      const res = await request(app).post('/api/recurrences').send(VALID_RECURRENCE_BODY);
      expect(res.status).toBe(201);
    });

    it('invalid: installment mode without occurrences_total returns 400', async () => {
      const res = await request(app)
        .post('/api/recurrences')
        .send({ ...VALID_RECURRENCE_BODY, mode: 'installment' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/recurrences/:id', () => {
    it('valid: updates an existing recurrence, returns 200', async () => {
      mockQueries.getRecurrenceById.mockResolvedValue({ id: 1, ...VALID_RECURRENCE_BODY });
      mockQueries.updateRecurrence.mockResolvedValue({ id: 1, amount: 200 });
      const res = await request(app).put('/api/recurrences/1').send({ amount: 200 });
      expect(res.status).toBe(200);
    });

    it('invalid: nonexistent recurrence returns 404', async () => {
      mockQueries.getRecurrenceById.mockResolvedValue(null);
      const res = await request(app).put('/api/recurrences/999').send({ amount: 200 });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/recurrences/:id', () => {
    it('valid: deletes an existing recurrence, returns 204', async () => {
      mockQueries.deleteRecurrence.mockResolvedValue({ id: 1 });
      const res = await request(app).delete('/api/recurrences/1');
      expect(res.status).toBe(204);
    });

    it('invalid: nonexistent recurrence returns 404', async () => {
      mockQueries.deleteRecurrence.mockResolvedValue(null);
      const res = await request(app).delete('/api/recurrences/999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/recurrences/:id/archive', () => {
    it('valid: archives an existing recurrence, returns 200', async () => {
      mockQueries.archiveRecurrence.mockResolvedValue({ id: 1, archived: true });
      const res = await request(app).post('/api/recurrences/1/archive');
      expect(res.status).toBe(200);
    });

    it('invalid: nonexistent recurrence returns 404', async () => {
      mockQueries.archiveRecurrence.mockResolvedValue(null);
      const res = await request(app).post('/api/recurrences/999/archive');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/recurrences/:id/restore', () => {
    it('valid: restores an existing recurrence, returns 200', async () => {
      mockQueries.restoreRecurrence.mockResolvedValue({ id: 1, archived: false });
      const res = await request(app).post('/api/recurrences/1/restore');
      expect(res.status).toBe(200);
    });

    it('invalid: nonexistent recurrence returns 404', async () => {
      mockQueries.restoreRecurrence.mockResolvedValue(null);
      const res = await request(app).post('/api/recurrences/999/restore');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/recurrences/:id/confirm', () => {
    it('valid: confirms an existing recurrence, returns 201', async () => {
      mockQueries.confirmRecurrence.mockResolvedValue({ id: 10, amount: 100 });
      const res = await request(app).post('/api/recurrences/1/confirm');
      expect(res.status).toBe(201);
    });

    it('invalid: nonexistent recurrence returns 404', async () => {
      mockQueries.confirmRecurrence.mockResolvedValue(null);
      const res = await request(app).post('/api/recurrences/999/confirm');
      expect(res.status).toBe(404);
    });
  });

  describe('GET+POST /api/recurrences/process', () => {
    // Route-order bug found during independent review after this test was
    // first written: GET /:id was registered above GET /process (unlike
    // /due, which the code deliberately registers before /:id for exactly
    // this reason), so a real Vercel Cron "GET /process" request matched
    // GET /:id first (id="process") and never reached processHandler — the
    // cron-invoked GET path was dead code in production. Fixed by moving
    // the /process registration above /:id, mirroring /due. The GET case
    // below is the regression test for that fix.
    it('valid: GET with correct Bearer CRON_SECRET returns 200 (regression test — route-order fix)', async () => {
      mockQueries.processRecurrences.mockResolvedValue({ processed: 0 });
      const res = await request(app).get('/api/recurrences/process').set('Authorization', 'Bearer test-cron-secret');
      expect(res.status).toBe(200);
    });

    it('valid: POST with correct Bearer CRON_SECRET returns 200', async () => {
      mockQueries.processRecurrences.mockResolvedValue({ processed: 0 });
      const res = await request(app).post('/api/recurrences/process').set('Authorization', 'Bearer test-cron-secret');
      expect(res.status).toBe(200);
    });

    it('invalid: missing/incorrect credentials returns 401', async () => {
      const res = await request(app).post('/api/recurrences/process');
      expect(res.status).toBe(401);
    });
  });
});
