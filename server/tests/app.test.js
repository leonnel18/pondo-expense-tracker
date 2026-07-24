// US-32 (1) — server module loads and exports an Express app without
// throwing when required env vars are present (set in tests/setup.js).
// US-32 (2) — CORS is enabled and the client's Vite proxy still points
// /api at the correct backend origin.
const fs = require('fs');
const path = require('path');
const request = require('supertest');

describe('server module load', () => {
  it('requires ../server without throwing and exports an Express app', () => {
    let app;
    expect(() => {
      app = require('../server');
    }).not.toThrow();

    expect(typeof app).toBe('function'); // an Express app is a callable function
    expect(typeof app.use).toBe('function');
    expect(typeof app.listen).toBe('function');
  });

  it('responds on the health check endpoint', async () => {
    const app = require('../server');
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });
});

describe('CORS', () => {
  it('sends Access-Control-Allow-Origin for cross-origin requests (app.use(cors()) is active)', async () => {
    const app = require('../server');
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  it('answers a CORS preflight (OPTIONS) request', async () => {
    const app = require('../server');
    const res = await request(app)
      .options('/api/accounts')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.status).toBeLessThan(500);
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });
});

describe('client Vite proxy configuration', () => {
  it('proxies /api to the local backend origin (http://localhost:3001)', () => {
    const viteConfigPath = path.join(__dirname, '..', '..', 'client', 'vite.config.js');
    const source = fs.readFileSync(viteConfigPath, 'utf8');

    // Sanity-check the proxy block exists and targets the backend's own
    // default port (matches server.js's `PORT = process.env.PORT || 3001`).
    expect(source).toMatch(/proxy\s*:/);
    expect(source).toMatch(/['"]\/api['"]\s*:/);
    expect(source).toMatch(/target:\s*['"]http:\/\/localhost:3001['"]/);
  });
});
