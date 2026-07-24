// US-32 (3) — categories.js route handlers, valid + invalid payload per handler.
const request = require('supertest');

jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
});

const mockQueries = {
  getCategories: jest.fn(),
  getCategoryById: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  getCategoryEntryCount: jest.fn(),
  // US-13: DELETE now checks subcategory count before the existing
  // is_default/entry-count logic. Defaults to 0 (no subcategories) so
  // every pre-existing test case below is unaffected unless it overrides
  // this explicitly. Not reset by jest.clearAllMocks() (that only clears
  // calls/results, not mockResolvedValue implementations).
  getSubcategoryCount: jest.fn().mockResolvedValue(0),
  getFallbackCategory: jest.fn(),
  reassignCategoryEntries: jest.fn(),
};

jest.mock('../db/queries', () => mockQueries);

describe('routes/categories.js', () => {
  let app;

  beforeAll(() => {
    app = require('../server');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/categories', () => {
    it('valid: returns 200', async () => {
      mockQueries.getCategories.mockResolvedValue([{ id: 1, name: 'Food', type: 'expense' }]);
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
    });

    it('invalid: unknown ?type value still returns 200 (no server crash)', async () => {
      mockQueries.getCategories.mockResolvedValue([]);
      const res = await request(app).get('/api/categories').query({ type: 'not-a-real-type' });
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/categories/:id', () => {
    it('valid: existing category returns 200', async () => {
      mockQueries.getCategoryById.mockResolvedValue({ id: 1, name: 'Food' });
      const res = await request(app).get('/api/categories/1');
      expect(res.status).toBe(200);
    });

    it('invalid: nonexistent category returns 404', async () => {
      mockQueries.getCategoryById.mockResolvedValue(null);
      const res = await request(app).get('/api/categories/999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/categories', () => {
    it('valid: creates category, returns 201', async () => {
      mockQueries.createCategory.mockResolvedValue({ id: 1, name: 'Food', type: 'expense' });
      const res = await request(app).post('/api/categories').send({ name: 'Food', type: 'expense' });
      expect(res.status).toBe(201);
    });

    it('invalid: missing required fields returns 400', async () => {
      const res = await request(app).post('/api/categories').send({ name: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('valid: updates existing category, returns 200', async () => {
      mockQueries.getCategoryById.mockResolvedValue({ id: 1, name: 'Food', color: null, icon: null });
      mockQueries.updateCategory.mockResolvedValue({ id: 1, name: 'Groceries' });
      const res = await request(app).put('/api/categories/1').send({ name: 'Groceries' });
      expect(res.status).toBe(200);
    });

    it('invalid: nonexistent category returns 404', async () => {
      mockQueries.getCategoryById.mockResolvedValue(null);
      const res = await request(app).put('/api/categories/999').send({ name: 'Groceries' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('valid: deletes a non-default category with no entries, returns 204', async () => {
      mockQueries.getCategoryById.mockResolvedValue({ id: 1, name: 'Food', is_default: false, type: 'expense' });
      mockQueries.getCategoryEntryCount.mockResolvedValue(0);
      mockQueries.deleteCategory.mockResolvedValue({ id: 1 });
      const res = await request(app).delete('/api/categories/1');
      expect(res.status).toBe(204);
    });

    it('invalid: default category cannot be deleted, returns 403', async () => {
      mockQueries.getCategoryById.mockResolvedValue({ id: 1, name: 'Other', is_default: true, type: 'expense' });
      const res = await request(app).delete('/api/categories/1');
      expect(res.status).toBe(403);
    });

    // US-13
    it('invalid: category with subcategories cannot be deleted, returns 409 HAS_SUBCATEGORIES', async () => {
      mockQueries.getCategoryById.mockResolvedValue({ id: 1, name: 'Shopping', is_default: false, type: 'expense', parent_category_id: null });
      mockQueries.getSubcategoryCount.mockResolvedValueOnce(2);
      const res = await request(app).delete('/api/categories/1');
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('HAS_SUBCATEGORIES');
    });

    // US-13: deleting a subcategory with entries reassigns them to its
    // own parent, not the type's global fallback.
    it('valid: deleting a subcategory with entries reassigns to its own parent, not the type fallback', async () => {
      mockQueries.getCategoryById.mockResolvedValue({ id: 5, name: 'Clothes', is_default: false, type: 'expense', parent_category_id: 4 });
      mockQueries.getCategoryEntryCount.mockResolvedValue(3);
      mockQueries.deleteCategory.mockResolvedValue({ id: 5 });
      const res = await request(app).delete('/api/categories/5');
      expect(res.status).toBe(204);
      expect(mockQueries.reassignCategoryEntries).toHaveBeenCalledWith('5', 4);
      expect(mockQueries.getFallbackCategory).not.toHaveBeenCalled();
    });
  });
});
