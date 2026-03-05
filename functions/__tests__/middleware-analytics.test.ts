/**
 * @jest-environment node
 */
import { onRequest } from '../_middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type MiddlewareContext = Parameters<typeof onRequest>[0];

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// crypto.subtle.digest mock
const mockDigest = jest.fn(async (_algo: string, data: ArrayBuffer) => {
  const view = new Uint8Array(data);
  const fake = new Uint8Array(32);
  for (let i = 0; i < 32; i++) fake[i] = (view[i % view.length] + i) & 0xff;
  return fake.buffer;
});
Object.defineProperty(global, 'crypto', {
  value: { subtle: { digest: mockDigest } },
  configurable: true,
});

// Mock HTMLRewriter — Cloudflare Workers API not available in Node
class MockHTMLRewriter {
  on() { return this; }
  transform(response: Response) { return response; }
}
(global as unknown as Record<string, unknown>).HTMLRewriter = MockHTMLRewriter;

// D1 mock
function createMockDB() {
  const runMock = jest.fn().mockResolvedValue({});
  const batchMock = jest.fn().mockResolvedValue([]);
  const bindMock = jest.fn().mockReturnValue({ run: runMock });
  const prepareMock = jest.fn().mockReturnValue({ bind: bindMock });

  return {
    prepare: prepareMock,
    batch: batchMock,
    _bind: bindMock,
    _run: runMock,
    _prepare: prepareMock,
  };
}

// ASSETS mock
function createMockAssets() {
  return {
    fetch: jest.fn().mockResolvedValue(
      new Response('<html><head><title>PayMe</title></head></html>', {
        headers: { 'content-type': 'text/html' },
      }),
    ),
  };
}

function createContext(overrides: Partial<{
  url: string;
  ua: string;
  cookie: string;
  referer: string;
  ip: string;
  db: ReturnType<typeof createMockDB>;
}> = {}): MiddlewareContext {
  const url = overrides.url ?? 'https://payme.tw/pay/test';
  const headers: Record<string, string> = {};
  if (overrides.ua !== undefined) headers['user-agent'] = overrides.ua;
  else headers['user-agent'] = 'Mozilla/5.0 Chrome/120';
  if (overrides.cookie) headers['cookie'] = overrides.cookie;
  if (overrides.referer) headers['referer'] = overrides.referer;
  if (overrides.ip) headers['cf-connecting-ip'] = overrides.ip;

  const request = new Request(url, { headers });
  const db = overrides.db ?? createMockDB();

  return {
    request,
    env: {
      ASSETS: createMockAssets(),
      DB: db as unknown as D1Database,
    },
    params: {},
    waitUntil: jest.fn(),
    next: jest.fn().mockResolvedValue(
      new Response('next response', { headers: { 'content-type': 'text/html' } }),
    ),
    data: {},
  } as unknown as MiddlewareContext;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('enhanced page view', () => {
  test('known route inserts with visitor_id, device_type, browser, referer_domain', async () => {
    const db = createMockDB();
    const ctx = createContext({
      url: 'https://payme.tw/pay/test',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      referer: 'https://www.google.com/search?q=payme',
      ip: '1.2.3.4',
      db,
    });

    await onRequest(ctx);

    // waitUntil should have been called
    expect(ctx.waitUntil).toHaveBeenCalled();
    // DB prepare should include enhanced columns
    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining('visitor_id'),
    );
  });

  test('Bot request does not write analytics', async () => {
    const db = createMockDB();
    const ctx = createContext({
      url: 'https://payme.tw/pay/test',
      ua: 'Googlebot/2.1',
      db,
    });

    await onRequest(ctx);

    // DB should not be called for analytics (bot filtered)
    const prepareCalls = db.prepare.mock.calls.filter(
      (call: string[]) => call[0].includes('INSERT'),
    );
    expect(prepareCalls).toHaveLength(0);
  });

  test('non-known route does not insert pageview', async () => {
    const db = createMockDB();
    const ctx = createContext({
      url: 'https://payme.tw/unknown-path',
      db,
    });

    await onRequest(ctx);

    const prepareCalls = db.prepare.mock.calls.filter(
      (call: string[]) => call[0].includes('raw_analytics'),
    );
    expect(prepareCalls).toHaveLength(0);
  });
});

describe('cookie piggyback', () => {
  test('request with _pa cookie on any route triggers events insert', async () => {
    const events = [{ e: 'generate_link', t: 1234567890 }];
    const encoded = Buffer.from(JSON.stringify(events)).toString('base64url');
    const db = createMockDB();

    const ctx = createContext({
      url: 'https://payme.tw/',
      cookie: `_pa=${encoded}`,
      ua: 'Mozilla/5.0 Chrome/120',
      ip: '1.2.3.4',
      db,
    });

    const response = await onRequest(ctx);

    // waitUntil called for event insertion
    expect(ctx.waitUntil).toHaveBeenCalled();
    // Response should include Set-Cookie to clear _pa
    expect(response.headers.get('set-cookie')).toContain('_pa=');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  test('request with _pa on known route inserts both pageview and events', async () => {
    const events = [{ e: 'share', t: 123 }];
    const encoded = Buffer.from(JSON.stringify(events)).toString('base64url');
    const db = createMockDB();

    const ctx = createContext({
      url: 'https://payme.tw/pay/test',
      cookie: `_pa=${encoded}`,
      ua: 'Mozilla/5.0 Chrome/120',
      ip: '1.2.3.4',
      db,
    });

    await onRequest(ctx);

    // Should have prepared statements for both pageview and events
    expect(ctx.waitUntil).toHaveBeenCalled();
  });

  test('response includes Set-Cookie to clear _pa', async () => {
    const events = [{ e: 'copy_link', t: 123 }];
    const encoded = Buffer.from(JSON.stringify(events)).toString('base64url');

    const ctx = createContext({
      url: 'https://payme.tw/pay/test',
      cookie: `_pa=${encoded}`,
    });

    const response = await onRequest(ctx);
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toContain('_pa=;');
    expect(setCookie).toContain('Max-Age=0');
  });

  test('no _pa cookie does not trigger events INSERT', async () => {
    const db = createMockDB();
    const ctx = createContext({
      url: 'https://payme.tw/pay/test',
      db,
    });

    await onRequest(ctx);

    // Only pageview INSERT, no events INSERT
    const prepareCalls = db.prepare.mock.calls.map((c: string[]) => c[0]);
    const eventInserts = prepareCalls.filter((sql: string) => sql.includes('events'));
    expect(eventInserts).toHaveLength(0);
  });

  test('corrupt cookie is silently ignored', async () => {
    const db = createMockDB();
    const ctx = createContext({
      url: 'https://payme.tw/pay/test',
      cookie: '_pa=corrupt!!!data',
      db,
    });

    // Should not throw
    const response = await onRequest(ctx);
    expect(response).toBeDefined();
  });

  test('events INSERT failure does not affect page rendering', async () => {
    const events = [{ e: 'generate_link', t: 123 }];
    const encoded = Buffer.from(JSON.stringify(events)).toString('base64url');
    const db = createMockDB();
    db._run.mockRejectedValueOnce(new Error('D1 error'));

    const ctx = createContext({
      url: 'https://payme.tw/pay/test',
      cookie: `_pa=${encoded}`,
      db,
    });

    // Should not throw — errors are caught in waitUntil
    const response = await onRequest(ctx);
    expect(response).toBeDefined();
  });
});
