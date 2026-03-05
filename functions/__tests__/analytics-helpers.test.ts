/**
 * @jest-environment node
 */
import {
  parseUserAgent,
  extractRefererDomain,
  generateVisitorId,
  extractCookie,
  parseCookieEvents,
  buildClearCookieHeader,
} from '../lib/analytics-helpers';

// crypto.subtle.digest mock (same pattern as submit.test.ts)
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

// ---------------------------------------------------------------------------
// parseUserAgent
// ---------------------------------------------------------------------------
describe('parseUserAgent', () => {
  test('Chrome desktop UA', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    expect(parseUserAgent(ua)).toEqual({ browser: 'Chrome', device: 'desktop' });
  });

  test('Safari iPhone UA', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(parseUserAgent(ua)).toEqual({ browser: 'Safari', device: 'mobile' });
  });

  test('Firefox Android UA', () => {
    const ua = 'Mozilla/5.0 (Android 14; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0';
    expect(parseUserAgent(ua)).toEqual({ browser: 'Firefox', device: 'mobile' });
  });

  test('iPad UA', () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(parseUserAgent(ua)).toEqual({ browser: 'Safari', device: 'tablet' });
  });

  test('null UA', () => {
    expect(parseUserAgent(null)).toEqual({ browser: 'unknown', device: 'unknown' });
  });

  test('empty string UA', () => {
    expect(parseUserAgent('')).toEqual({ browser: 'unknown', device: 'unknown' });
  });
});

// ---------------------------------------------------------------------------
// extractRefererDomain
// ---------------------------------------------------------------------------
describe('extractRefererDomain', () => {
  test('Google search referer', () => {
    expect(extractRefererDomain('https://www.google.com/search?q=x')).toBe('google.com');
  });

  test('t.co short URL', () => {
    expect(extractRefererDomain('https://t.co/abc')).toBe('t.co');
  });

  test('null referer', () => {
    expect(extractRefererDomain(null)).toBeNull();
  });

  test('same-origin referer is null', () => {
    expect(extractRefererDomain('https://payme.tw/pay/123', 'payme.tw')).toBeNull();
  });

  test('same-origin with www prefix is null', () => {
    expect(extractRefererDomain('https://www.payme.tw/pay/123', 'payme.tw')).toBeNull();
  });

  test('invalid URL returns null', () => {
    expect(extractRefererDomain('not-a-url')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// generateVisitorId
// ---------------------------------------------------------------------------
describe('generateVisitorId', () => {
  test('same IP+UA+date produces same hash', async () => {
    const a = await generateVisitorId('1.2.3.4', 'Chrome', '2026-03-05');
    const b = await generateVisitorId('1.2.3.4', 'Chrome', '2026-03-05');
    expect(a).toBe(b);
  });

  test('different IP produces different hash', async () => {
    const a = await generateVisitorId('1.2.3.4', 'Chrome', '2026-03-05');
    const b = await generateVisitorId('9.9.9.9', 'Chrome', '2026-03-05');
    expect(a).not.toBe(b);
  });

  test('returns 16-char hex string', async () => {
    const id = await generateVisitorId('1.2.3.4', 'Chrome', '2026-03-05');
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ---------------------------------------------------------------------------
// extractCookie
// ---------------------------------------------------------------------------
describe('extractCookie', () => {
  test('extracts _pa from cookie header', () => {
    expect(extractCookie('_pa=abc; other=xyz', '_pa')).toBe('abc');
  });

  test('null cookie header', () => {
    expect(extractCookie(null, '_pa')).toBeNull();
  });

  test('cookie without _pa', () => {
    expect(extractCookie('other=xyz; foo=bar', '_pa')).toBeNull();
  });

  test('extracts correct cookie when multiple present', () => {
    expect(extractCookie('foo=1; _pa=hello; bar=2', '_pa')).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// parseCookieEvents
// ---------------------------------------------------------------------------
describe('parseCookieEvents', () => {
  test('valid base64url JSON returns EventRecord[]', () => {
    const events = [{ e: 'generate_link', t: 1234567890 }];
    const encoded = Buffer.from(JSON.stringify(events)).toString('base64url');
    expect(parseCookieEvents(encoded)).toEqual(events);
  });

  test('empty string returns []', () => {
    expect(parseCookieEvents('')).toEqual([]);
  });

  test('null returns []', () => {
    expect(parseCookieEvents(null)).toEqual([]);
  });

  test('corrupt data returns []', () => {
    expect(parseCookieEvents('not-valid-base64!!!')).toEqual([]);
  });

  test('filters out invalid items', () => {
    const data = [
      { e: 'generate_link', t: 123 },
      { foo: 'bar' },
      'string',
    ];
    const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
    const result = parseCookieEvents(encoded);
    expect(result).toHaveLength(1);
    expect(result[0].e).toBe('generate_link');
  });

  test('events with data field', () => {
    const events = [{ e: 'share', t: 123, d: { method: 'native' } }];
    const encoded = Buffer.from(JSON.stringify(events)).toString('base64url');
    expect(parseCookieEvents(encoded)).toEqual(events);
  });
});

// ---------------------------------------------------------------------------
// buildClearCookieHeader
// ---------------------------------------------------------------------------
describe('buildClearCookieHeader', () => {
  test('returns correct Set-Cookie value', () => {
    expect(buildClearCookieHeader()).toBe('_pa=; Path=/; Max-Age=0; SameSite=Lax');
  });
});
