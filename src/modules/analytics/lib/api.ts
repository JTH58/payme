import type { TimeRange } from '../types';

const API_BASE = '/api';

export async function login(password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/analytics-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({})) as { error?: string };
    return { ok: false, error: `${res.status}: ${data.error || res.statusText}` };
  } catch (err) {
    return { ok: false, error: `Network error: ${(err as Error).message}` };
  }
}

export async function fetchAnalytics<T>(type: string, range: TimeRange): Promise<T> {
  const params = new URLSearchParams({ type, range });
  const res = await fetch(`${API_BASE}/analytics?${params}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    const err = new Error(data.error || `API error: ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return res.json();
}
