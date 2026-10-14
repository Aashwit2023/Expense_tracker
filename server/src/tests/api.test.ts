import request from 'supertest';
import { app } from '../app';

describe('API Health and Protected Routes Authorization', () => {
  test('GET /api/health returns 200 OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('Personalized Money Tracker');
  });

  test('Protected routes reject requests missing authorization header with 401', async () => {
    const protectedEndpoints = [
      '/api/transactions',
      '/api/accounts',
      '/api/budgets',
      '/api/obligations',
      '/api/trips',
      '/api/recurring',
      '/api/reports/dashboard',
      '/api/groups',
    ];

    for (const endpoint of protectedEndpoints) {
      const res = await request(app).get(endpoint);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Authentication required|Invalid or expired token/);
    }
  });

  test('POST /api/auth/login validates required fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
