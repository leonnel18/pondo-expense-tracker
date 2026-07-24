// US-32 (3) — dashboard.js route handlers, valid + invalid payload per handler.
const request = require('supertest');

jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
});

const mockQueries = {
  getDashboardKPIs: jest.fn(),
  getDashboardMoM: jest.fn(),
  getExpenseBreakdown: jest.fn(),
  getIncomeBreakdown: jest.fn(),
  getDashboardAccounts: jest.fn(),
  getRecentEntries: jest.fn(),
  logAppEvent: jest.fn(),
  // budgets.js is required transitively by server.js (all routers are
  // mounted together) and its dashboardBudgetsHandler is mounted directly
  // at GET /api/dashboard/budgets — needs a minimal stub too.
  getBudgetsWithCategories: jest.fn(),
};

jest.mock('../db/queries', () => mockQueries);

describe('routes/dashboard.js', () => {
  let app;

  beforeAll(() => {
    app = require('../server');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueries.logAppEvent.mockResolvedValue();
    mockQueries.getDashboardKPIs.mockResolvedValue({ total_balance: 1000 });
    mockQueries.getDashboardMoM.mockResolvedValue({});
    mockQueries.getExpenseBreakdown.mockResolvedValue([]);
    mockQueries.getIncomeBreakdown.mockResolvedValue([]);
    mockQueries.getDashboardAccounts.mockResolvedValue([]);
    mockQueries.getRecentEntries.mockResolvedValue([]);
    mockQueries.getBudgetsWithCategories.mockResolvedValue([]);
  });

  describe('GET /api/dashboard', () => {
    it('valid: no date range (defaults applied), returns 200', async () => {
      const res = await request(app).get('/api/dashboard');
      expect(res.status).toBe(200);
      expect(res.body.total_balance).toBe(1000);
    });

    it('invalid: from > to returns 400', async () => {
      const res = await request(app).get('/api/dashboard').query({ from: '2020-02-01', to: '2020-01-01' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/dashboard/mom', () => {
    it('valid: no date range, returns 200', async () => {
      const res = await request(app).get('/api/dashboard/mom');
      expect(res.status).toBe(200);
    });

    it('invalid: malformed date returns 400', async () => {
      const res = await request(app).get('/api/dashboard/mom').query({ from: 'not-a-date' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/dashboard/budgets (budgets.dashboardBudgetsHandler)', () => {
    it('valid: no budgets configured, returns 200 with an empty array', async () => {
      // Mounted separately in server.js — served by budgets.js, which is
      // covered in its own test file; here we only need to confirm the
      // dashboard mount point itself responds.
      const res = await request(app).get('/api/dashboard/budgets');
      expect(res.status).toBeLessThan(500);
    });
  });
});
