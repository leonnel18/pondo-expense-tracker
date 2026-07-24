// US-32 (3) — tags.js route handlers, valid + invalid payload per handler.
const request = require('supertest');

jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
});

const mockQueries = {
  getTags: jest.fn(),
  createTag: jest.fn(),
  deleteTag: jest.fn(),
  getTagsReport: jest.fn(),
};

jest.mock('../db/queries', () => mockQueries);

describe('routes/tags.js', () => {
  let app;

  beforeAll(() => {
    app = require('../server');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tags', () => {
    it('valid: returns 200', async () => {
      mockQueries.getTags.mockResolvedValue([{ id: 1, name: 'groceries' }]);
      const res = await request(app).get('/api/tags');
      expect(res.status).toBe(200);
    });

    it('edge case: ?q= prefix filter with no matches still returns 200', async () => {
      mockQueries.getTags.mockResolvedValue([]);
      const res = await request(app).get('/api/tags').query({ q: 'zzz-no-match' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/tags/report', () => {
    it('valid: returns 200', async () => {
      mockQueries.getTagsReport.mockResolvedValue([]);
      const res = await request(app).get('/api/tags/report');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/tags', () => {
    it('valid: creates a new tag, returns 201', async () => {
      mockQueries.createTag.mockResolvedValue({ tag: { id: 1, name: 'groceries' }, created: true });
      const res = await request(app).post('/api/tags').send({ name: 'groceries' });
      expect(res.status).toBe(201);
    });

    it('invalid: empty name returns 400', async () => {
      const res = await request(app).post('/api/tags').send({ name: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/tags/:id', () => {
    it('valid: deletes an existing tag, returns 200', async () => {
      mockQueries.deleteTag.mockResolvedValue({ id: 1 });
      const res = await request(app).delete('/api/tags/1');
      expect(res.status).toBe(200);
    });

    it('invalid: nonexistent tag returns 404', async () => {
      mockQueries.deleteTag.mockResolvedValue(null);
      const res = await request(app).delete('/api/tags/999');
      expect(res.status).toBe(404);
    });
  });
});
