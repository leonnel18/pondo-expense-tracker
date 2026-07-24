// US-32 (3) — auth.js route handlers, valid + invalid payload per handler.
// auth.js talks to db/supabase's `.auth` namespace directly (Supabase Auth
// SDK), not db/queries — mocked accordingly. /me additionally exercises
// the real authMiddleware (that's the whole point of the route), so unlike
// the other route test files this one mocks lib/supabase-auth's
// verifyToken instead of blanket-replacing middleware/auth.
const request = require('supertest');

const mockVerifyToken = jest.fn();
jest.mock('../lib/supabase-auth', () => ({
  verifyToken: mockVerifyToken,
}));

const mockAuth = {
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  refreshSession: jest.fn(),
};
jest.mock('../db/supabase', () => ({
  auth: mockAuth,
}));

jest.mock('../db/queries', () => ({}));

describe('routes/auth.js', () => {
  let app;

  beforeAll(() => {
    app = require('../server');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    it('valid: email + password (>=8 chars) returns 201', async () => {
      mockAuth.signUp.mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@example.com', created_at: '2026-01-01' }, session: null },
        error: null,
      });
      const res = await request(app).post('/api/auth/signup').send({ email: 'a@example.com', password: 'password123' });
      expect(res.status).toBe(201);
    });

    it('invalid: password too short returns 400', async () => {
      const res = await request(app).post('/api/auth/signup').send({ email: 'a@example.com', password: 'short' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/signin', () => {
    it('valid: correct credentials return 200', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@example.com' }, session: { access_token: 'a', refresh_token: 'b', expires_in: 3600 } },
        error: null,
      });
      const res = await request(app).post('/api/auth/signin').send({ email: 'a@example.com', password: 'password123' });
      expect(res.status).toBe(200);
    });

    it('invalid: wrong credentials return 401', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } });
      const res = await request(app).post('/api/auth/signin').send({ email: 'a@example.com', password: 'wrongpass' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/signout', () => {
    it('valid: always clears cookies, returns 204', async () => {
      const res = await request(app).post('/api/auth/signout');
      expect(res.status).toBe(204);
    });
  });

  describe('GET /api/auth/me', () => {
    it('valid: valid token returns 200 with the user', async () => {
      mockVerifyToken.mockResolvedValue({ id: 'u1', email: 'a@example.com' });
      const res = await request(app).get('/api/auth/me').set('Cookie', ['sb-access-token=valid-token']);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('a@example.com');
    });

    it('invalid: missing token returns 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('valid: valid refresh token returns 200', async () => {
      mockAuth.refreshSession.mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@example.com' }, session: { access_token: 'a', refresh_token: 'b', expires_in: 3600 } },
        error: null,
      });
      const res = await request(app).post('/api/auth/refresh').set('Cookie', ['sb-refresh-token=valid-refresh']);
      expect(res.status).toBe(200);
    });

    it('invalid: missing refresh token cookie returns 401', async () => {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.status).toBe(401);
    });
  });
});
