/**
 * @jest-environment node
 */
import { onRequest } from '../api/analytics';

type AnalyticsContext = Parameters<typeof onRequest>[0];

// We need real crypto for HMAC validation
// jest.setup.js provides Web Crypto polyfill

// Import signSession to create valid tokens
import { signSession } from '../lib/analytics-auth-helpers';

const TEST_PASSWORD = 'test-analytics-pw';

function createMockDB() {
  const allMock = jest.fn().mockResolvedValue({ results: [] });
  const prepareMock = jest.fn().mockReturnValue({ all: allMock });
  const batchMock = jest.fn().mockResolvedValue([
    { results: [{ count: 100 }] },
    { results: [{ count: 42 }] },
    { results: [{ count: 55 }] },
    { results: [{ days: 7 }] },
  ]);
  return { prepare: prepareMock, batch: batchMock };
}

async function createContext(overrides: Partial<{
  method: string;
  type: string;
  range: string;
  cookie: string | null;
}> = {}): Promise<AnalyticsContext> {
  const method = overrides.method ?? 'GET';
  const params = new URLSearchParams();
  if (overrides.type !== undefined) params.set('type', overrides.type);
  if (overrides.range) params.set('range', overrides.range);

  const headers: Record<string, string> = {};

  // Default to valid cookie unless explicitly set to null
  if (overrides.cookie !== null) {
    const token = overrides.cookie ?? await signSession(TEST_PASSWORD);
    headers['cookie'] = `_as=${token}`;
  }

  const request = new Request(
    `https://payme.tw/api/analytics?${params.toString()}`,
    { method, headers },
  );

  return {
    request,
    env: { ANALYTICS_PASSWORD: TEST_PASSWORD, DB: createMockDB() as unknown },
    params: {},
    waitUntil: jest.fn(),
    next: jest.fn(),
  } as unknown as AnalyticsContext;
}

describe('Auth checks', () => {
  test('no cookie → 401', async () => {
    const ctx = await createContext({ type: 'summary', cookie: null });
    const res = await onRequest(ctx);
    expect(res.status).toBe(401);
  });

  test('invalid cookie → 401', async () => {
    const ctx = await createContext({ type: 'summary', cookie: 'invalid.token.here' });
    const res = await onRequest(ctx);
    expect(res.status).toBe(401);
  });
});

describe('Param validation', () => {
  test('missing type → 400', async () => {
    const ctx = await createContext({});
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('type');
  });

  test('invalid type → 400', async () => {
    const ctx = await createContext({ type: 'invalid' });
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
  });

  test('invalid range → 400', async () => {
    const ctx = await createContext({ type: 'summary', range: 'invalid' });
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
  });
});

describe('Summary query', () => {
  test('returns correct shape', async () => {
    const ctx = await createContext({ type: 'summary' });
    const res = await onRequest(ctx);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('totalPageviews');
    expect(data).toHaveProperty('uniqueVisitors');
    expect(data).toHaveProperty('totalEvents');
    expect(data).toHaveProperty('avgDailyPageviews');
  });
});

describe('List queries', () => {
  const listTypes = ['trend', 'devices', 'browsers', 'referers', 'events', 'pages'];

  listTypes.forEach(type => {
    test(`${type} returns { data: [] }`, async () => {
      const ctx = await createContext({ type });
      const res = await onRequest(ctx);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
    });
  });
});

describe('HTTP methods', () => {
  test('OPTIONS → 204', async () => {
    const ctx = await createContext({ method: 'OPTIONS', type: 'summary' });
    const res = await onRequest(ctx);
    expect(res.status).toBe(204);
  });

  test('POST → 405', async () => {
    const ctx = await createContext({ method: 'POST', type: 'summary' });
    const res = await onRequest(ctx);
    expect(res.status).toBe(405);
  });
});
