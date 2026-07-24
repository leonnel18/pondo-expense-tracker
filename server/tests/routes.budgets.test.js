// US-32 (3) — budgets.js route handlers, valid + invalid payload per handler.
const request = require('supertest');

jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
});

const mockQueries = {
  getBudgets: jest.fn(),
  getBudgetById: jest.fn(),
  createBudget: jest.fn(),
  updateBudget: jest.fn(),
  deleteBudget: jest.fn(),
  getBudgetsWithCategories: jest.fn(),
  getExpenseBreakdown: jest.fn(),
};

jest.mock('../db/queries', () => mockQueries);

const VALID_BUDGET_BODY = {
  category_id: 1,
  amount: 500,
  cycle: 'monthly',
  cycle_start: '2020-01-01',
};

describe('routes/budgets.js', () => {
  let app;

  beforeAll(() => {
    app = require('../server');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/budgets', () => {
    it('valid: returns 200', async () => {
      mockQueries.getBudgets.mockResolvedValue([]);
      const res = await request(app).get('/api/budgets');
      expect(res.status).toBe(200);
    });

    it('invalid: non-numeric category_id filter returns 400', async () => {
      const res = await request(app).get('/api/budgets').query({ category_id: 'abc' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/budgets/:id', () => {
    it('valid: existing budget returns 200', async () => {
      mockQueries.getBudgetById.mockResolvedValue({ id: 1, ...VALID_BUDGET_BODY });
      const res = await request(app).get('/api/budgets/1');
      expect(res.status).toBe(200);
    });

    it('invalid: nonexistent budget returns 404', async () => {
      mockQueries.getBudgetById.mockResolvedValue(null);
      const res = await request(app).get('/api/budgets/999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/budgets', () => {
    it('valid: creates a budget, returns 201', async () => {
      mockQueries.createBudget.mockResolvedValue({ id: 1, ...VALID_BUDGET_BODY });
      const res = await request(app).post('/api/budgets').send(VALID_BUDGET_BODY);
      expect(res.status).toBe(201);
    });

    it('invalid: cycle=custom without cycle_end returns 400', async () => {
      const res = await request(app).post('/api/budgets').send({ ...VALID_BUDGET_BODY, cycle: 'custom' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/budgets/:id', () => {
    it('valid: updates existing budget, returns 200', async () => {
      mockQueries.getBudgetById.mockResolvedValue({ id: 1, ...VALID_BUDGET_BODY });
      mockQueries.updateBudget.mockResolvedValue({ id: 1, amount: 600 });
      const res = await request(app).put('/api/budgets/1').send({ amount: 600 });
      expect(res.status).toBe(200);
    });

    it('invalid: nonexistent budget returns 404', async () => {
      mockQueries.getBudgetById.mockResolvedValue(null);
      const res = await request(app).put('/api/budgets/999').send({ amount: 600 });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/budgets/:id', () => {
    it('valid: deletes existing budget, returns 204', async () => {
      mockQueries.deleteBudget.mockResolvedValue({ id: 1 });
      const res = await request(app).delete('/api/budgets/1');
      expect(res.status).toBe(204);
    });

    it('invalid: nonexistent budget returns 404', async () => {
      mockQueries.deleteBudget.mockResolvedValue(null);
      const res = await request(app).delete('/api/budgets/999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/dashboard/budgets (dashboardBudgetsHandler)', () => {
    it('valid: no budgets configured, returns 200 with an empty array', async () => {
      mockQueries.getBudgetsWithCategories.mockResolvedValue([]);
      const res = await request(app).get('/api/dashboard/budgets');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('valid: enriches a configured budget with spend/percent, returns 200', async () => {
      mockQueries.getBudgetsWithCategories.mockResolvedValue([
        {
          id: 1,
          category_id: 2,
          category_name: 'Food',
          category_color: '#1F7A64',
          category_icon: '🍔',
          amount: 500,
          cycle: 'monthly',
          cycle_start: '2020-01-01',
          cycle_end: null,
          reuse_next: true,
        },
      ]);
      mockQueries.getExpenseBreakdown.mockResolvedValue([{ id: 2, total_amount: 100 }]);
      const res = await request(app).get('/api/dashboard/budgets');
      expect(res.status).toBe(200);
      expect(res.body[0].spend).toBe(100);
    });
  });
});
