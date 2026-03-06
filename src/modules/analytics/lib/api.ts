import type { TimeRange } from '../types';

const API_BASE = '/api';

export async function login(password: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/analytics-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

export async function fetchAnalytics<T>(type: string, range: TimeRange): Promise<T> {
  const params = new URLSearchParams({ type, range });
  const res = await fetch(`${API_BASE}/analytics?${params}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? 'Unauthorized' : `API error: ${res.status}`);
  }
  return res.json();
}
