/// <reference types="@cloudflare/workers-types" />

import { signSession, getSessionCookieHeader } from '../lib/analytics-auth-helpers';

interface Env {
  ANALYTICS_PASSWORD: string;
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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extraHeaders },
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  if (!body.password || body.password !== env.ANALYTICS_PASSWORD) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const token = await signSession(env.ANALYTICS_PASSWORD);
  const cookie = getSessionCookieHeader(token);

  return jsonResponse({ success: true }, 200, { 'Set-Cookie': cookie });
};
