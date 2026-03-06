/**
 * Analytics auth helpers — pure functions, 0 external dependencies.
 * HMAC-SHA256 signed session cookie for analytics dashboard access.
 */

async function hmacSign(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacVerify(message: string, signature: string, key: string): Promise<boolean> {
  const expected = await hmacSign(message, key);
  if (expected.length !== signature.length) return false;
  // Constant-time comparison
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Sign a session token: "timestamp.random.hmac"
 */
export async function signSession(password: string): Promise<string> {
  const ts = Math.floor(Date.now() / 1000).toString();
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const payload = `${ts}.${rand}`;
  const mac = await hmacSign(payload, password);
  return `${payload}.${mac}`;
}

/**
 * Validate a session token: check HMAC + 24hr expiry.
 */
export async function validateSession(
  cookieValue: string | null | undefined,
  password: string,
): Promise<boolean> {
  if (!cookieValue) return false;
  const parts = cookieValue.split('.');
  if (parts.length !== 3) return false;

  const [tsStr, rand, mac] = parts;
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts)) return false;

  // 24hr expiry
  const now = Math.floor(Date.now() / 1000);
  if (now - ts > 86400) return false;

  const payload = `${tsStr}.${rand}`;
  return hmacVerify(payload, mac, password);
}

/**
 * Build Set-Cookie header string for session token.
 */
export function getSessionCookieHeader(token: string): string {
  return `_as=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`;
}
