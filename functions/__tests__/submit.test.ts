/**
 * @jest-environment node
 */
import { onRequest } from '../api/submit';

// ---------------------------------------------------------------------------
// Types — match the PagesFunction context shape from submit.ts
// ---------------------------------------------------------------------------
type SubmitContext = Parameters<typeof onRequest>[0];

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
function createMockKV(store: Record<string, string> = {}) {
  return {
    get: jest.fn(async (key: string) => store[key] ?? null),
    put: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
  };
}

const mockFetch = jest.fn();
global.fetch = mockFetch;

// crypto mocks (randomUUID + subtle.digest)
const mockRandomUUID = jest.fn(() => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
const mockDigest = jest.fn(async (_algo: string, data: ArrayBuffer) => {
  // Simple deterministic "hash" for testing: repeat first byte
  const view = new Uint8Array(data);
  const fake = new Uint8Array(32);
  for (let i = 0; i < 32; i++) fake[i] = (view[i % view.length] + i) & 0xff;
  return fake.buffer;
});
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: mockRandomUUID, subtle: { digest: mockDigest } },
  configurable: true,
});

function createTypedContext(overrides: Partial<{
  method: string;
  url: string;
  body: unknown;
  env: Record<string, unknown>;
  ip: string;
}> = {}): SubmitContext {
  const method = overrides.method ?? 'POST';
  const url = overrides.url ?? 'https://payme.tw/api/submit';
  const ip = overrides.ip ?? '1.2.3.4';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ip) headers['CF-Connecting-IP'] = ip;

  const request = new Request(url, {
    method,
    headers,
    ...(overrides.body !== undefined
      ? { body: JSON.stringify(overrides.body) }
      : {}),
  });

  return {
    request,
    env: overrides.env ?? {
      RATE_KV: createMockKV(),
      DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test',
    },
    params: {},
    waitUntil: jest.fn(),
    next: jest.fn(),
  } as SubmitContext;
}

const validFeedback = {
  type: 'feedback',
  category: 'bug',
  description: '這個功能有問題，無法正常運作喔。',
};

const validTemplate = {
  type: 'template',
  authorName: '小明',
  formState: {
    mode: 'pay',
    title: '聚餐分帳',
    amount: '1000',
    pax: 4,
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('submit Edge Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
  });

  // -------------------------------------------------------------------------
  // CORS & Method
  // -------------------------------------------------------------------------
  describe('CORS & Method', () => {
    test('OPTIONS → 204 + CORS headers', async () => {
      const ctx = createTypedContext({ method: 'OPTIONS' });
      const res = await onRequest(ctx);
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://payme.tw');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    test('GET → 405', async () => {
      const ctx = createTypedContext({ method: 'GET' });
      const res = await onRequest(ctx);
      expect(res.status).toBe(405);
    });

    test('PUT → 405', async () => {
      const ctx = createTypedContext({ method: 'PUT' });
      const res = await onRequest(ctx);
      expect(res.status).toBe(405);
    });
  });

  // -------------------------------------------------------------------------
  // Rate Limiting
  // -------------------------------------------------------------------------
  describe('Rate Limiting', () => {
    test('同 IP 10 分鐘內重複 → 429', async () => {
      const kv = createMockKV({ 'submit:1.2.3.4': '1' });
      const ctx = createTypedContext({
        body: validFeedback,
        env: { RATE_KV: kv, DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' },
      });
      const res = await onRequest(ctx);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    test('不同 IP 不受限制', async () => {
      const kv = createMockKV({ 'submit:9.9.9.9': '1' });
      const ctx = createTypedContext({
        body: validFeedback,
        ip: '1.2.3.4',
        env: { RATE_KV: kv, DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' },
      });
      const res = await onRequest(ctx);
      expect(res.status).toBe(200);
    });

    test('成功後寫入 KV 速率限制', async () => {
      const kv = createMockKV();
      const ctx = createTypedContext({
        body: validFeedback,
        env: { RATE_KV: kv, DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' },
      });
      await onRequest(ctx);
      expect(kv.put).toHaveBeenCalledWith('submit:1.2.3.4', '1', { expirationTtl: 600 });
    });
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  describe('Validation', () => {
    test('無效 JSON → 400', async () => {
      const ctx = createTypedContext({ method: 'POST' });
      // Override the request with invalid JSON body
      const request = new Request('https://payme.tw/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
        body: 'not json',
      });
      ctx.request = request;
      const res = await onRequest(ctx);
      expect(res.status).toBe(400);
      // 不打 Discord
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('description 太短 → 400', async () => {
      const ctx = createTypedContext({
        body: { ...validFeedback, description: '太短' },
      });
      const res = await onRequest(ctx);
      expect(res.status).toBe(400);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('type 不存在 → 400', async () => {
      const ctx = createTypedContext({
        body: { type: 'unknown', foo: 'bar' },
      });
      const res = await onRequest(ctx);
      expect(res.status).toBe(400);
    });

    test('template formState 含 bankCode → 400', async () => {
      const ctx = createTypedContext({
        body: {
          ...validTemplate,
          formState: { ...validTemplate.formState, bankCode: '004' },
        },
      });
      const res = await onRequest(ctx);
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // Feedback Submissions
  // -------------------------------------------------------------------------
  describe('Feedback Submissions', () => {
    test('合法 feedback → 200 + Discord 收到 Embed', async () => {
      const ctx = createTypedContext({ body: validFeedback });
      const res = await onRequest(ctx);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Discord webhook called
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [webhookUrl, fetchOpts] = mockFetch.mock.calls[0];
      expect(webhookUrl).toBe('https://discord.com/api/webhooks/test');
      const discordBody = JSON.parse(fetchOpts.body);
      expect(discordBody.embeds).toHaveLength(1);
      expect(discordBody.embeds[0].title).toContain('問題回報');
    });

    test('Bug 類別 → Embed 顏色 #FF4444', async () => {
      const ctx = createTypedContext({ body: { ...validFeedback, category: 'bug' } });
      await onRequest(ctx);
      const discordBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(discordBody.embeds[0].color).toBe(0xFF4444);
    });

    test('Suggestion 類別 → Embed 顏色 #4488FF', async () => {
      const ctx = createTypedContext({ body: { ...validFeedback, category: 'suggestion' } });
      await onRequest(ctx);
      const discordBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(discordBody.embeds[0].color).toBe(0x4488FF);
    });

    test('Other 類別 → Embed 顏色 #AAAAAA', async () => {
      const ctx = createTypedContext({ body: { ...validFeedback, category: 'other' } });
      await onRequest(ctx);
      const discordBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(discordBody.embeds[0].color).toBe(0xAAAAAA);
    });

    test('description 含 HTML → 清理後轉發', async () => {
      const ctx = createTypedContext({
        body: { ...validFeedback, description: '問題描述 <script>alert("xss")</script> 結尾文字' },
      });
      await onRequest(ctx);
      const discordBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const descField = discordBody.embeds[0].fields.find(
        (f: { name: string }) => f.name === '描述',
      );
      expect(descField.value).not.toContain('<script>');
      expect(descField.value).toContain('問題描述');
    });

    test('含 contact → Embed 有聯絡方式欄位', async () => {
      const ctx = createTypedContext({
        body: { ...validFeedback, contact: 'test@example.com' },
      });
      await onRequest(ctx);
      const discordBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const contactField = discordBody.embeds[0].fields.find(
        (f: { name: string }) => f.name === '聯絡方式',
      );
      expect(contactField).toBeDefined();
      expect(contactField.value).toBe('test@example.com');
    });
  });

  // -------------------------------------------------------------------------
  // Template Submissions
  // -------------------------------------------------------------------------
  describe('Template Submissions', () => {
    test('合法 template → 200 + Discord 含 UUID + JSON block', async () => {
      const ctx = createTypedContext({ body: validTemplate });
      const res = await onRequest(ctx);
      expect(res.status).toBe(200);

      const discordBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const embed = discordBody.embeds[0];
      expect(embed.title).toContain('模板投稿');
      expect(embed.color).toBe(0x44FF88);

      // UUID in embed
      const idField = embed.fields.find(
        (f: { name: string }) => f.name === '建議 ID',
      );
      expect(idField.value).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

      // JSON code block
      const jsonField = embed.fields.find(
        (f: { name: string }) => f.name === 'FormState JSON',
      );
      expect(jsonField.value).toContain('```json');
    });

    test('template 含 notes', async () => {
      const ctx = createTypedContext({
        body: { ...validTemplate, notes: '很好用的模板' },
      });
      await onRequest(ctx);
      const discordBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const notesField = discordBody.embeds[0].fields.find(
        (f: { name: string }) => f.name === '備註',
      );
      expect(notesField).toBeDefined();
      expect(notesField.value).toBe('很好用的模板');
    });
  });

  // -------------------------------------------------------------------------
  // Discord Error Handling
  // -------------------------------------------------------------------------
  describe('Discord Error Handling', () => {
    test('Discord 500 → 回 502，不寫 KV', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      const kv = createMockKV();
      const ctx = createTypedContext({
        body: validFeedback,
        env: { RATE_KV: kv, DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' },
      });
      const res = await onRequest(ctx);
      expect(res.status).toBe(502);
      expect(kv.put).not.toHaveBeenCalled();
    });

    test('Discord fetch 拋出例外 → 回 502，不寫 KV', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const kv = createMockKV();
      const ctx = createTypedContext({
        body: validFeedback,
        env: { RATE_KV: kv, DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' },
      });
      const res = await onRequest(ctx);
      expect(res.status).toBe(502);
      expect(kv.put).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // IP Privacy
  // -------------------------------------------------------------------------
  describe('IP Privacy', () => {
    test('Embed footer 應顯示 IP hash 前 8 碼而非完整 IP', async () => {
      const ctx = createTypedContext({ body: validFeedback, ip: '203.0.113.42' });
      await onRequest(ctx);
      const discordBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const footerText = discordBody.embeds[0].footer.text;
      expect(footerText).not.toContain('203.0.113.42');
      expect(footerText).toMatch(/IP: [a-f0-9]{8}/);
    });

    test('缺少 CF-Connecting-IP header → 使用 unknown', async () => {
      const request = new Request('https://payme.tw/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validFeedback),
      });
      const ctx = createTypedContext({ body: validFeedback });
      ctx.request = request;
      const res = await onRequest(ctx);
      expect(res.status).toBe(200);
    });
  });
});
