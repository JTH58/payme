/// <reference types="@cloudflare/workers-types" />

interface Env {
  RATE_KV: KVNamespace;
}

type PagesFunction<T = unknown> = (context: {
  request: Request;
  env: T;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<unknown>) => void;
  next: () => Promise<Response>;
}) => Promise<Response> | Response;

const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;
const KV_TTL = 600; // 10 minutes
const GITHUB_REPO = 'JTH58/payme';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://payme.tw',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Only GET allowed
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const sha = url.searchParams.get('sha');

  // Validate SHA format
  if (!sha || !SHA_PATTERN.test(sha)) {
    return jsonResponse({ status: 'error', reason: 'Invalid SHA format' }, 400);
  }

  const kvKey = `verify:${sha}`;

  // KV cache hit
  const cached = await env.RATE_KV.get(kvKey);
  if (cached) {
    return jsonResponse({ status: cached });
  }

  // Cache miss → call GitHub API
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/commits/${sha}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'PayMe-TrustShield/1.0',
        },
      }
    );

    if (res.status === 200) {
      await env.RATE_KV.put(kvKey, 'verified', { expirationTtl: KV_TTL });
      return jsonResponse({ status: 'verified' });
    }

    // 404 or 422 — commit not found
    await env.RATE_KV.put(kvKey, 'unknown', { expirationTtl: KV_TTL });
    return jsonResponse({ status: 'unknown' });
  } catch {
    // Network error — don't cache
    return jsonResponse({ status: 'error' });
  }
};
