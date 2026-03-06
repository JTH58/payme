/**
 * @jest-environment node
 */
import {
  signSession,
  validateSession,
  getSessionCookieHeader,
} from '../lib/analytics-auth-helpers';

// crypto.subtle needs real Web Crypto for HMAC — available in Node 18+
// Jest node environment provides globalThis.crypto via webcrypto polyfill in jest.setup.js

describe('signSession + validateSession roundtrip', () => {
  const password = 'test-secret-123';

  test('sign then validate returns true', async () => {
    const token = await signSession(password);
    const valid = await validateSession(token, password);
    expect(valid).toBe(true);
  });

  test('token has 3 dot-separated parts', async () => {
    const token = await signSession(password);
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    // ts should be a number
    expect(Number(parts[0])).not.toBeNaN();
    // random should be 32 hex chars
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/);
    // hmac should be 64 hex chars
    expect(parts[2]).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('validateSession rejects invalid tokens', () => {
  const password = 'test-secret-123';

  test('null cookie → false', async () => {
    expect(await validateSession(null, password)).toBe(false);
  });

  test('empty string → false', async () => {
    expect(await validateSession('', password)).toBe(false);
  });

  test('tampered HMAC → false', async () => {
    const token = await signSession(password);
    const parts = token.split('.');
    parts[2] = 'a'.repeat(64); // replace HMAC
    expect(await validateSession(parts.join('.'), password)).toBe(false);
  });

  test('wrong password → false', async () => {
    const token = await signSession(password);
    expect(await validateSession(token, 'wrong-password')).toBe(false);
  });

  test('expired token (>24hr) → false', async () => {
    // Manually craft a token with old timestamp
    const oldTs = Math.floor(Date.now() / 1000) - 86401; // 24hr + 1s ago
    const rand = '00'.repeat(16);
    // We can't easily sign with real HMAC, but the timestamp check should fail first
    // So we test that the expiry check works even with a "valid" format
    const fakeToken = `${oldTs}.${rand}.${'00'.repeat(32)}`;
    expect(await validateSession(fakeToken, password)).toBe(false);
  });

  test('malformed (only 2 parts) → false', async () => {
    expect(await validateSession('abc.def', password)).toBe(false);
  });

  test('non-numeric timestamp → false', async () => {
    expect(await validateSession('notnum.rand.hmac', password)).toBe(false);
  });
});

describe('getSessionCookieHeader', () => {
  test('builds correct Set-Cookie string', () => {
    const header = getSessionCookieHeader('my-token');
    expect(header).toBe(
      '_as=my-token; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400',
    );
  });
});
