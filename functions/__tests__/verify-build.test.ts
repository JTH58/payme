/**
 * @jest-environment node
 */
import { onRequest } from '../api/verify-build';

// ---------------------------------------------------------------------------
// Types — match the PagesFunction context shape from verify-build.ts
// ---------------------------------------------------------------------------
type VerifyBuildContext = Parameters<typeof onRequest>[0];

// Mock KV namespace
function createMockKV(store: Record<string, string> = {}) {
  return {
    get: jest.fn(async (key: string) => store[key] ?? null),
    put: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
  };
}

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

function createTypedContext(overrides: Partial<{
  method: string;
  url: string;
  env: Record<string, unknown>;
}> = {}): VerifyBuildContext {
  const method = overrides.method ?? 'GET';
  const url = overrides.url ?? 'https://payme.tw/api/verify-build?sha=abc1234';
  return {
    request: new Request(url, { method }),
    env: overrides.env ?? { RATE_KV: createMockKV() },
    params: {},
    waitUntil: jest.fn(),
    next: jest.fn(),
  } as VerifyBuildContext;
}

describe('verify-build Edge Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 204 for OPTIONS (CORS preflight)', async () => {
    const ctx = createTypedContext({ method: 'OPTIONS' });
    const res = await onRequest(ctx);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://payme.tw');
  });

  it('should return 405 for non-GET methods', async () => {
    const ctx = createTypedContext({ method: 'POST' });
    const res = await onRequest(ctx);
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error).toBe('Method not allowed');
  });

  it('should return 400 for missing SHA', async () => {
    const ctx = createTypedContext({ url: 'https://payme.tw/api/verify-build' });
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.status).toBe('error');
  });

  it('should return 400 for invalid SHA format', async () => {
    const ctx = createTypedContext({ url: 'https://payme.tw/api/verify-build?sha=not-a-sha!' });
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
  });

  it('should return cached result on KV hit', async () => {
    const kv = createMockKV({ 'verify:abc1234': 'verified' });
    const ctx = createTypedContext({ env: { RATE_KV: kv } });
    const res = await onRequest(ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('verified');
    expect(kv.get).toHaveBeenCalledWith('verify:abc1234');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should call GitHub API on KV miss and cache verified result', async () => {
    const kv = createMockKV();
    mockFetch.mockResolvedValueOnce({ status: 200 });
    const ctx = createTypedContext({ env: { RATE_KV: kv } });
    const res = await onRequest(ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('verified');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // L5: 驗證 fetch URL 格式
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/commits/abc1234'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'PayMe-TrustShield/1.0',
        }),
      })
    );
    expect(kv.put).toHaveBeenCalledWith('verify:abc1234', 'verified', { expirationTtl: 600 });
  });

  it('should return unknown for GitHub 404 and cache it', async () => {
    const kv = createMockKV();
    mockFetch.mockResolvedValueOnce({ status: 404 });
    const ctx = createTypedContext({ env: { RATE_KV: kv } });
    const res = await onRequest(ctx);
    const body = await res.json();
    expect(body.status).toBe('unknown');
    expect(kv.put).toHaveBeenCalledWith('verify:abc1234', 'unknown', { expirationTtl: 600 });
  });

  it('should return error on fetch failure without caching', async () => {
    const kv = createMockKV();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const ctx = createTypedContext({ env: { RATE_KV: kv } });
    const res = await onRequest(ctx);
    const body = await res.json();
    expect(body.status).toBe('error');
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('should validate 7-char SHA', async () => {
    const kv = createMockKV();
    mockFetch.mockResolvedValueOnce({ status: 200 });
    const ctx = createTypedContext({
      url: 'https://payme.tw/api/verify-build?sha=a1b2c3d',
      env: { RATE_KV: kv },
    });
    const res = await onRequest(ctx);
    expect(res.status).toBe(200);
  });

  it('should validate 40-char full SHA', async () => {
    const fullSha = 'a'.repeat(40);
    const kv = createMockKV();
    mockFetch.mockResolvedValueOnce({ status: 200 });
    const ctx = createTypedContext({
      url: `https://payme.tw/api/verify-build?sha=${fullSha}`,
      env: { RATE_KV: kv },
    });
    const res = await onRequest(ctx);
    expect(res.status).toBe(200);
    // L5: 驗證完整 SHA 的 fetch URL 格式
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/commits/${fullSha}`),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept': 'application/vnd.github.v3+json',
        }),
      })
    );
  });
});
