/**
 * Client-side analytics event collector.
 * Events are stored in localStorage and flushed to a cookie on visibilitychange.
 * The server reads the cookie on next page request (Cookie Piggyback).
 */
import { STORAGE_KEY } from '@/config/storage-keys';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface EventRecord {
  e: string;
  t: number;
  d?: unknown;
}

// ---------------------------------------------------------------------------
// Allowed events
// ---------------------------------------------------------------------------
export const ANALYTICS_EVENTS = [
  'generate_link',
  'copy_link',
  'share',
  'download_qr',
  'mode_change',
  'copy_account',
] as const;

type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

const MAX_EVENTS = 50;
const COOKIE_MAX_BYTES = 3500; // ~3.5KB cookie limit

// ---------------------------------------------------------------------------
// Core: trackEvent / getEvents / clearEvents
// ---------------------------------------------------------------------------
export function trackEvent(event: string, data?: unknown): void {
  if (!ANALYTICS_EVENTS.includes(event as AnalyticsEvent)) return;
  try {
    const events = getEvents();
    const record: EventRecord = { e: event, t: Date.now() };
    if (data !== undefined) record.d = data;
    events.push(record);
    // FIFO: keep latest MAX_EVENTS
    while (events.length > MAX_EVENTS) events.shift();
    localStorage.setItem(STORAGE_KEY.analytics, JSON.stringify(events));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function getEvents(): EventRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY.analytics);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(STORAGE_KEY.analytics);
      return [];
    }
    return parsed;
  } catch {
    try { localStorage.removeItem(STORAGE_KEY.analytics); } catch { /* ignore */ }
    return [];
  }
}

export function clearEvents(): void {
  try {
    localStorage.removeItem(STORAGE_KEY.analytics);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Serialization: base64url JSON
// ---------------------------------------------------------------------------
function base64urlEncode(str: string): string {
  // btoa → base64url
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return atob(b64);
}

export function serializeEvents(events: EventRecord[]): string {
  if (events.length === 0) return '';
  return base64urlEncode(JSON.stringify(events));
}

export function deserializeEvents(encoded: string): EventRecord[] {
  if (!encoded) return [];
  try {
    const json = base64urlDecode(encoded);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Cookie flush
// ---------------------------------------------------------------------------
export function flushEventsToCookie(): void {
  const events = getEvents();
  if (events.length === 0) return;

  // Truncate oldest events to fit cookie size limit
  let toFlush = [...events];
  let encoded = serializeEvents(toFlush);
  while (encoded.length > COOKIE_MAX_BYTES && toFlush.length > 1) {
    toFlush.shift();
    encoded = serializeEvents(toFlush);
  }

  document.cookie = `_pa=${encoded}; Path=/; SameSite=Lax; Max-Age=86400`;
  clearEvents();
}

// ---------------------------------------------------------------------------
// Auto-flush on visibilitychange
// ---------------------------------------------------------------------------
export function setupAutoFlush(): () => void {
  const handler = () => {
    if (document.hidden) {
      flushEventsToCookie();
    }
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
