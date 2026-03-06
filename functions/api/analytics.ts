/// <reference types="@cloudflare/workers-types" />

import { validateSession } from '../lib/analytics-auth-helpers';
import { extractCookie } from '../lib/analytics-helpers';

interface Env {
  ANALYTICS_PASSWORD: string;
  DB: D1Database;
}

type PagesFunction<T = unknown> = (context: {
  request: Request;
  env: T;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<unknown>) => void;
  next: () => Promise<Response>;
}) => Promise<Response> | Response;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://payme.tw',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

const VALID_TYPES = ['summary', 'trend', 'devices', 'browsers', 'referers', 'events', 'pages'] as const;
type QueryType = (typeof VALID_TYPES)[number];

const VALID_RANGES = ['today', '7d', '30d', 'all'] as const;
type TimeRange = (typeof VALID_RANGES)[number];

function getRangeFilter(range: TimeRange): string {
  switch (range) {
    case 'today': return `AND created_at >= strftime('%s', 'now', 'start of day')`;
    case '7d': return `AND created_at >= strftime('%s', 'now', '-7 days')`;
    case '30d': return `AND created_at >= strftime('%s', 'now', '-30 days')`;
    case 'all': return '';
  }
}

function getDaysInRange(range: TimeRange): number {
  switch (range) {
    case 'today': return 1;
    case '7d': return 7;
    case '30d': return 30;
    case 'all': return 0; // will be computed from data
  }
}

async function querySummary(db: D1Database, range: TimeRange) {
  const filter = getRangeFilter(range);
  const days = getDaysInRange(range);

  const results = await db.batch([
    db.prepare(`SELECT COUNT(*) as count FROM raw_analytics WHERE 1=1 ${filter}`),
    db.prepare(`SELECT COUNT(DISTINCT visitor_id) as count FROM raw_analytics WHERE 1=1 ${filter}`),
    db.prepare(`SELECT COUNT(*) as count FROM events WHERE 1=1 ${filter}`),
    ...(days > 0
      ? [db.prepare(`SELECT ${days} as days`)]
      : [db.prepare(`SELECT CAST((strftime('%s', 'now') - MIN(created_at)) / 86400 AS INTEGER) + 1 as days FROM raw_analytics`)]),
  ]);

  const totalPageviews = (results[0].results[0] as { count: number })?.count ?? 0;
  const uniqueVisitors = (results[1].results[0] as { count: number })?.count ?? 0;
  const totalEvents = (results[2].results[0] as { count: number })?.count ?? 0;
  const totalDays = (results[3].results[0] as { days: number })?.days || 1;

  return {
    totalPageviews,
    uniqueVisitors,
    totalEvents,
    avgDailyPageviews: Math.round(totalPageviews / totalDays),
  };
}

async function queryTrend(db: D1Database, range: TimeRange) {
  const filter = getRangeFilter(range);
  const stmt = db.prepare(
    `SELECT DATE(created_at, 'unixepoch') as date,
            COUNT(*) as pageviews,
            COUNT(DISTINCT visitor_id) as visitors
     FROM raw_analytics WHERE 1=1 ${filter}
     GROUP BY DATE(created_at, 'unixepoch')
     ORDER BY date`,
  );
  const result = await stmt.all();
  return { data: result.results };
}

async function queryDevices(db: D1Database, range: TimeRange) {
  const filter = getRangeFilter(range);
  const stmt = db.prepare(
    `SELECT device_type as name, COUNT(*) as value
     FROM raw_analytics WHERE 1=1 ${filter}
     GROUP BY device_type`,
  );
  const result = await stmt.all();
  return { data: result.results };
}

async function queryBrowsers(db: D1Database, range: TimeRange) {
  const filter = getRangeFilter(range);
  const stmt = db.prepare(
    `SELECT browser as name, COUNT(*) as value
     FROM raw_analytics WHERE 1=1 ${filter}
     GROUP BY browser`,
  );
  const result = await stmt.all();
  return { data: result.results };
}

async function queryReferers(db: D1Database, range: TimeRange) {
  const filter = getRangeFilter(range);
  const stmt = db.prepare(
    `SELECT referer_domain as name, COUNT(*) as value
     FROM raw_analytics WHERE referer_domain IS NOT NULL ${filter}
     GROUP BY referer_domain ORDER BY value DESC LIMIT 10`,
  );
  const result = await stmt.all();
  return { data: result.results };
}

async function queryEvents(db: D1Database, range: TimeRange) {
  const filter = getRangeFilter(range);
  const stmt = db.prepare(
    `SELECT event as name, COUNT(*) as value
     FROM events WHERE 1=1 ${filter}
     GROUP BY event`,
  );
  const result = await stmt.all();
  return { data: result.results };
}

async function queryPages(db: D1Database, range: TimeRange) {
  const filter = getRangeFilter(range);
  const stmt = db.prepare(
    `SELECT path, COUNT(*) as pageviews, COUNT(DISTINCT visitor_id) as visitors
     FROM raw_analytics WHERE 1=1 ${filter}
     GROUP BY path ORDER BY pageviews DESC LIMIT 20`,
  );
  const result = await stmt.all();
  return { data: result.results };
}

const QUERY_MAP: Record<QueryType, (db: D1Database, range: TimeRange) => Promise<unknown>> = {
  summary: querySummary,
  trend: queryTrend,
  devices: queryDevices,
  browsers: queryBrowsers,
  referers: queryReferers,
  events: queryEvents,
  pages: queryPages,
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Auth check
  const cookieHeader = request.headers.get('cookie');
  const sessionCookie = extractCookie(cookieHeader, '_as');
  const isValid = await validateSession(sessionCookie, env.ANALYTICS_PASSWORD);
  if (!isValid) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // Parse query params
  const url = new URL(request.url);
  const type = url.searchParams.get('type') as QueryType | null;
  const range = (url.searchParams.get('range') || '7d') as TimeRange;

  if (!type || !VALID_TYPES.includes(type)) {
    return jsonResponse({ error: 'Invalid or missing type parameter' }, 400);
  }
  if (!VALID_RANGES.includes(range)) {
    return jsonResponse({ error: 'Invalid range parameter' }, 400);
  }

  const data = await QUERY_MAP[type](env.DB, range);
  return jsonResponse(data);
};
