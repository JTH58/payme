/// <reference types="@cloudflare/workers-types" />

import { submitSchema, stripHtmlTags } from '../../src/modules/feedback/schemas/submit-schema';

interface Env {
  RATE_KV: KVNamespace;
  DISCORD_WEBHOOK_URL: string;
}

type PagesFunction<T = unknown> = (context: {
  request: Request;
  env: T;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<unknown>) => void;
  next: () => Promise<Response>;
}) => Promise<Response> | Response;

const KV_TTL = 600; // 10 minutes

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://payme.tw',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Simple SHA-256 hash → hex, first 8 chars
async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 8);
}

// Sanitize all string fields recursively
function sanitizeStrings<T>(obj: T): T {
  if (typeof obj === 'string') return stripHtmlTags(obj) as T;
  if (Array.isArray(obj)) return obj.map(sanitizeStrings) as T;
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeStrings(value);
    }
    return result as T;
  }
  return obj;
}

// Discord Embed color map
const FEEDBACK_COLORS: Record<string, number> = {
  bug: 0xFF4444,
  suggestion: 0x4488FF,
  other: 0xAAAAAA,
};

const FEEDBACK_TITLES: Record<string, string> = {
  bug: '🐛 問題回報 — Bug',
  suggestion: '💡 功能建議',
  other: '📩 其他回饋',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Only POST
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Get client IP
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Rate limiting
  const kvKey = `submit:${ip}`;
  const rateLimited = await env.RATE_KV.get(kvKey);
  if (rateLimited) {
    return jsonResponse({ error: '請稍候再試', retryAfter: KV_TTL }, 429);
  }

  // Parse JSON body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse({ error: '無效的 JSON 格式' }, 400);
  }

  // Zod validation
  const parsed = submitSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonResponse(
      { error: '驗證失敗', details: parsed.error.issues },
      400,
    );
  }

  // Sanitize all string fields
  const data = sanitizeStrings(parsed.data);

  // Build Discord Embed
  const ipHash = await hashIp(ip);

  let embed: Record<string, unknown>;

  if (data.type === 'feedback') {
    embed = {
      title: FEEDBACK_TITLES[data.category] || FEEDBACK_TITLES.other,
      color: FEEDBACK_COLORS[data.category] || FEEDBACK_COLORS.other,
      fields: [
        { name: '描述', value: data.description, inline: false },
        ...(data.contact
          ? [{ name: '聯絡方式', value: data.contact, inline: true }]
          : []),
        ...(data.userAgent
          ? [{ name: 'User Agent', value: data.userAgent, inline: false }]
          : []),
      ],
      footer: { text: `IP: ${ipHash}` },
      timestamp: new Date().toISOString(),
    };
  } else {
    // template
    const suggestedId = crypto.randomUUID();
    const formStateJson = JSON.stringify(data.formState, null, 2);
    const title = data.formState.title || '未命名';

    embed = {
      title: `📝 模板投稿 — ${title}`,
      color: 0x44FF88,
      fields: [
        { name: '投稿人', value: data.authorName, inline: true },
        { name: '建議 ID', value: suggestedId, inline: true },
        ...(data.notes
          ? [{ name: '備註', value: data.notes, inline: false }]
          : []),
        {
          name: 'FormState JSON',
          value: `\`\`\`json\n${formStateJson}\n\`\`\``,
          inline: false,
        },
        ...(data.userAgent
          ? [{ name: 'User Agent', value: data.userAgent, inline: false }]
          : []),
      ],
      footer: { text: `IP: ${ipHash}` },
      timestamp: new Date().toISOString(),
    };
  }

  // Send to Discord
  try {
    const discordRes = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!discordRes.ok) {
      return jsonResponse({ error: '轉發失敗' }, 502);
    }
  } catch {
    return jsonResponse({ error: '轉發失敗' }, 502);
  }

  // Success → write rate limit
  await env.RATE_KV.put(kvKey, '1', { expirationTtl: KV_TTL });

  return jsonResponse({ success: true });
};
