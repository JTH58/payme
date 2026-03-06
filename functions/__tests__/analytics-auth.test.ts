/**
 * @jest-environment node
 */
import { onRequest } from '../api/analytics-auth';

type AuthContext = Parameters<typeof onRequest>[0];

// crypto.subtle — real Web Crypto from jest.setup.js polyfill

function createContext(overrides: Partial<{
  method: string;
  body: unknown;
  password: string;
}> = {}): AuthContext {
  const method = overrides.method ?? 'POST';
  const request = new Request('https://payme.tw/api/analytics-auth', {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(overrides.body !== undefined
      ? { body: JSON.stringify(overrides.body) }
      : method === 'POST'
        ? { body: JSON.stringify({ password: 'correct' }) }
        : {}),
  });

  return {
    request,
    env: { ANALYTICS_PASSWORD: overrides.password ?? 'correct' },
    params: {},
    waitUntil: jest.fn(),
    next: jest.fn(),
  } as AuthContext;
}

describe('POST /api/analytics-auth', () => {
  test('correct password → 200 + Set-Cookie', async () => {
    const ctx = createContext({ body: { password: 'correct' } });
    const res = await onRequest(ctx);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ success: true });
    const cookie = res.headers.get('Set-Cookie');
    expect(cookie).toMatch(/^_as=.+; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400$/);
  });

  test('wrong password → 401', async () => {
    const ctx = createContext({ body: { password: 'wrong' } });
    const res = await onRequest(ctx);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  test('missing password → 401', async () => {
    const ctx = createContext({ body: {} });
    const res = await onRequest(ctx);
    expect(res.status).toBe(401);
  });

  test('invalid JSON → 400', async () => {
    const request = new Request('https://payme.tw/api/analytics-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const ctx = {
      request,
      env: { ANALYTICS_PASSWORD: 'correct' },
      params: {},
      waitUntil: jest.fn(),
      next: jest.fn(),
    } as AuthContext;
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
  });
});

describe('OPTIONS /api/analytics-auth', () => {
  test('returns 204 with CORS headers', async () => {
    const ctx = createContext({ method: 'OPTIONS' });
    const res = await onRequest(ctx);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });
});

describe('GET /api/analytics-auth', () => {
  test('returns 405', async () => {
    const ctx = createContext({ method: 'GET' });
    const res = await onRequest(ctx);
    expect(res.status).toBe(405);
  });
});
