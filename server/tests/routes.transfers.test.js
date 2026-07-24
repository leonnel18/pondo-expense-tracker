// US-32 (3) — transfers.js route handlers, valid + invalid payload per handler.
const request = require('supertest');

jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
});

const mockQueries = {
  createTransfer: jest.fn(),
  updateTransfer: jest.fn(),
  deleteTransfer: jest.fn(),
  getTransferByGroupId: jest.fn(),
};

jest.mock('../db/queries', () => mockQueries);

const VALID_TRANSFER_BODY = {
  from_account_id: 1,
  to_account_id: 2,
  amount: 100,
  date: '2020-01-01',
};

describe('routes/transfers.js', () => {
  let app;

  beforeAll(() => {
    app = require('../server');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/transfers', () => {
    it('valid: creates a transfer, returns 201', async () => {
      mockQueries.createTransfer.mockResolvedValue({ transfer_group_id: 'abc' });
      const res = await request(app).post('/api/transfers').send(VALID_TRANSFER_BODY);
      expect(res.status).toBe(201);
    });

    it('invalid: missing required fields returns 400', async () => {
      const res = await request(app).post('/api/transfers').send({ amount: 100 });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/transfers/:transferGroupId', () => {
    it('valid: updates a transfer, returns 200', async () => {
      mockQueries.updateTransfer.mockResolvedValue({ transfer_group_id: 'abc' });
      const res = await request(app).put('/api/transfers/abc').send(VALID_TRANSFER_BODY);
      expect(res.status).toBe(200);
    });

    it('invalid: missing required fields returns 400', async () => {
      const res = await request(app).put('/api/transfers/abc').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/transfers/:transferGroupId', () => {
    it('valid: deletes a transfer, returns 200', async () => {
      mockQueries.deleteTransfer.mockResolvedValue({ deleted: true });
      const res = await request(app).delete('/api/transfers/abc');
      expect(res.status).toBe(200);
    });

    it('invalid: nonexistent transfer group returns 404', async () => {
      mockQueries.deleteTransfer.mockResolvedValue({ error: 'Transfer not found' });
      const res = await request(app).delete('/api/transfers/does-not-exist');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/transfers/:transferGroupId', () => {
    it('valid: existing transfer returns 200', async () => {
      mockQueries.getTransferByGroupId.mockResolvedValue({ transfer_group_id: 'abc' });
      const res = await request(app).get('/api/transfers/abc');
      expect(res.status).toBe(200);
    });

    it('invalid: nonexistent transfer group returns 404', async () => {
      mockQueries.getTransferByGroupId.mockResolvedValue(null);
      const res = await request(app).get('/api/transfers/does-not-exist');
      expect(res.status).toBe(404);
    });
  });
});
