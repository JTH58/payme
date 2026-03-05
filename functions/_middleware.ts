/// <reference types="@cloudflare/workers-types" />
import { APP_ROUTES, AppRoutePrefix } from '../src/config/routes';
import {
  parseUserAgent,
  extractRefererDomain,
  generateVisitorId,
  extractCookie,
  parseCookieEvents,
  buildClearCookieHeader,
  type EventRecord,
} from './lib/analytics-helpers';

// Define Env interface for Cloudflare Pages
interface Env {
  ASSETS: { fetch: (request: Request | string | URL) => Promise<Response> };
  DB: D1Database;
}

// Minimal type definition for PagesFunction to avoid needing @cloudflare/workers-types immediately
type PagesFunction<T = unknown> = (context: {
  request: Request;
  env: T;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<unknown>) => void;
  next: () => Promise<Response>;
  data: Record<string, unknown>;
}) => Promise<Response> | Response;

/**
 * Bot/Crawler 偵測
 * 過濾搜尋引擎爬蟲、社群平台 OG Fetcher 等非真人流量
 */
const BOT_PATTERNS = /bot|crawl|spider|slurp|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Discordbot|Googlebot|Bingbot|YandexBot|Baiduspider|DuckDuckBot|Applebot|line-poker|Pinterestbot/i;

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // 無 UA 視為 Bot
  return BOT_PATTERNS.test(userAgent);
}

/**
 * Helper: append Set-Cookie to a response (clones if headers are immutable)
 */
function appendSetCookie(response: Response, setCookieValue: string): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.append('Set-Cookie', setCookieValue);
  return newResponse;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next, waitUntil } = context;
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const prefix = pathParts[0] as AppRoutePrefix;
  const ua = request.headers.get('user-agent');

  // ---------------------------------------------------------------------------
  // 1. Cookie Piggyback — process on ANY request (creator operates on /)
  // ---------------------------------------------------------------------------
  const cookieHeader = request.headers.get('cookie');
  const paCookie = extractCookie(cookieHeader, '_pa');
  let clientEvents: EventRecord[] = [];
  let hasCookieToProcess = false;
  if (paCookie) {
    clientEvents = parseCookieEvents(paCookie);
    hasCookieToProcess = true; // clear cookie even if events are empty/corrupt
  }

  // ---------------------------------------------------------------------------
  // 2. Compute visitor_id if needed (for pageview or events)
  // ---------------------------------------------------------------------------
  const isKnownRoute = !!(prefix && APP_ROUTES[prefix]);
  const needsVisitorId = (!isBot(ua) && isKnownRoute) || clientEvents.length > 0;
  let visitorId: string | null = null;
  if (needsVisitorId) {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const dateStr = new Date().toISOString().slice(0, 10);
    try {
      visitorId = await generateVisitorId(ip, ua || '', dateStr);
    } catch {
      // crypto unavailable — skip visitor_id
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Enhanced pageview INSERT (known route + non-bot)
  // ---------------------------------------------------------------------------
  if (isKnownRoute && !isBot(ua)) {
    const { browser, device } = parseUserAgent(ua);
    const refererDomain = extractRefererDomain(
      request.headers.get('referer'),
      url.hostname,
    );
    const userInfo = {
      ua,
      country: request.headers.get('cf-ipcountry'),
      referer: request.headers.get('referer'),
    };

    waitUntil(
      env.DB.prepare(
        'INSERT INTO raw_analytics (path, user_info, visitor_id, device_type, browser, referer_domain) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind(
          url.pathname,
          JSON.stringify(userInfo),
          visitorId,
          device,
          browser,
          refererDomain,
        )
        .run()
        .catch(err => console.error('Analytics Error:', err)),
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Client events INSERT (cookie piggyback)
  // ---------------------------------------------------------------------------
  if (clientEvents.length > 0) {
    waitUntil(
      Promise.all(
        clientEvents.map(event =>
          env.DB.prepare(
            'INSERT INTO events (visitor_id, event, data, event_ts) VALUES (?, ?, ?, ?)',
          )
            .bind(
              visitorId,
              event.e,
              event.d !== undefined ? JSON.stringify(event.d) : null,
              event.t,
            )
            .run(),
        ),
      ).catch(err => console.error('Events Error:', err)),
    );
  }

  // ---------------------------------------------------------------------------
  // 5. Route handling (existing logic)
  // ---------------------------------------------------------------------------

  // /backup — rewrite 回首頁，不做 OG 改寫，不記錄 analytics
  if (prefix === 'backup') {
    const response = await env.ASSETS.fetch(new URL('/', request.url));
    return hasCookieToProcess
      ? appendSetCookie(response, buildClearCookieHeader())
      : response;
  }

  // If not a recognized route prefix, just continue (serve static assets or 404)
  if (!isKnownRoute) {
    const response = await next();
    return hasCookieToProcess
      ? appendSetCookie(response, buildClearCookieHeader())
      : response;
  }

  const routeConfig = APP_ROUTES[prefix];
  const params: Record<string, string | undefined> = {};

  // Parse segments based on config
  routeConfig.segments.forEach((segment, index) => {
    const value = pathParts[index + 1];
    if (value) {
      try {
        params[segment.key] = decodeURIComponent(value);
      } catch (e) {
        params[segment.key] = value;
      }
    }
  });

  // Generate Meta (now includes image)
  const meta = routeConfig.metaGenerator(params);
  const imageUrl = new URL(meta.image, url.origin).href;

  // Discord 會在 OG 預覽卡片的標題連結中移除 # hash fragment，
  // 導致點擊標題時遺失付款資料。偵測 Discordbot 時改寫標題提醒使用者。
  const isDiscordBot = /Discordbot/i.test(ua || '');
  const ogTitle = isDiscordBot
    ? `PayMe.TW 收款 - ⚠️ 請點擊上方網址`
    : meta.title;
  const ogDescription = isDiscordBot
    ? `點擊網址開始收款！( Discord 預覽會導致資料遺失)`
    : meta.description;

  // Fetch the actual index.html (SPA root)
  const assetResponse = await env.ASSETS.fetch(new URL('/', request.url));

  // Apply rewrites using HTMLRewriter
  let response = new HTMLRewriter()
    // Title
    .on('title', {
      element(element) {
        element.setInnerContent(ogTitle);
      },
    })
    // Open Graph
    .on('meta[property="og:title"]', {
      element(element) {
        element.setAttribute('content', ogTitle);
      },
    })
    .on('meta[property="og:description"]', {
      element(element) {
        element.setAttribute('content', ogDescription);
      },
    })
    .on('meta[property="og:image"]', {
      element(element) {
        element.setAttribute('content', imageUrl);
      },
    })
    .on('meta[property="og:url"]', {
      element(element) {
        element.setAttribute('content', request.url);
      },
    })
    .on('meta[property="og:type"]', {
      element(element) {
        element.setAttribute('content', 'website');
      },
    })
    // Twitter Card
    .on('meta[name="twitter:card"]', {
      element(element) {
        element.setAttribute('content', 'summary_large_image');
      },
    })
    .on('meta[name="twitter:title"]', {
      element(element) {
        element.setAttribute('content', ogTitle);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(element) {
        element.setAttribute('content', ogDescription);
      },
    })
    .on('meta[name="twitter:image"]', {
      element(element) {
        element.setAttribute('content', imageUrl);
      },
    })
    // Standard description
    .on('meta[name="description"]', {
      element(element) {
        element.setAttribute('content', ogDescription);
      },
    })
    .transform(assetResponse);

  // Append Set-Cookie to clear _pa if cookie was present
  if (hasCookieToProcess) {
    response = appendSetCookie(response, buildClearCookieHeader());
  }

  return response;
};
