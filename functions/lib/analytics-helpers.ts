/**
 * Analytics helper functions — pure logic, no external dependencies.
 * Used by middleware for server-side analytics enhancement + cookie piggyback.
 */

// ---------------------------------------------------------------------------
// UA Parsing
// ---------------------------------------------------------------------------
export interface ParsedUA {
  browser: string;
  device: string;
}

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) return { browser: 'unknown', device: 'unknown' };

  // Browser detection (order matters — check specific first)
  let browser = 'unknown';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  // Device detection
  let device = 'desktop';
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && /touch/i.test(ua))) {
    device = 'tablet';
  } else if (/Mobile|Android|iPhone|iPod/i.test(ua)) {
    device = 'mobile';
  }

  return { browser, device };
}

// ---------------------------------------------------------------------------
// Referer Domain
// ---------------------------------------------------------------------------
export function extractRefererDomain(
  referer: string | null | undefined,
  ownHost?: string,
): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    const host = url.hostname.replace(/^www\./, '');
    if (ownHost && host === ownHost.replace(/^www\./, '')) return null;
    return host;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Visitor ID
// ---------------------------------------------------------------------------
export async function generateVisitorId(
  ip: string,
  ua: string,
  dateStr: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${ip}|${ua}|${dateStr}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes.slice(0, 8))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------
export function extractCookie(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

// ---------------------------------------------------------------------------
// Cookie event parsing (base64url JSON)
// ---------------------------------------------------------------------------
export interface EventRecord {
  e: string;
  t: number;
  d?: unknown;
}

function base64urlDecode(str: string): string {
  // base64url → base64
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  // atob available in Workers runtime
  return atob(b64);
}

export function parseCookieEvents(value: string | null | undefined): EventRecord[] {
  if (!value) return [];
  try {
    const json = base64urlDecode(value);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as EventRecord).e === 'string' &&
        typeof (item as EventRecord).t === 'number',
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Clear cookie header
// ---------------------------------------------------------------------------
export function buildClearCookieHeader(): string {
  return '_pa=; Path=/; Max-Age=0; SameSite=Lax';
}
