/// <reference types="@cloudflare/workers-types" />
import { APP_ROUTES, AppRoutePrefix } from '../src/config/routes';

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

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next, waitUntil } = context;
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // pathParts[0] should be the prefix (pay, bill)
  const prefix = pathParts[0] as AppRoutePrefix;

  // Analytics: 僅記錄已知路由且非 Bot 的訪問
  const ua = request.headers.get('user-agent');
  if (prefix && APP_ROUTES[prefix] && !isBot(ua)) {
    const userInfo = {
        ua,
        country: request.headers.get('cf-ipcountry'),
        referer: request.headers.get('referer'),
    };

    waitUntil(
        env.DB.prepare(
            'INSERT INTO raw_analytics (path, user_info) VALUES (?, ?)'
        )
        .bind(url.pathname, JSON.stringify(userInfo))
        .run()
        .catch(err => console.error('Analytics Error:', err))
    );
  }

  // /backup — rewrite 回首頁，不做 OG 改寫，不記錄 analytics
  if (prefix === 'backup') {
    return env.ASSETS.fetch(new URL('/', request.url));
  }

  // If not a recognized route prefix, just continue (serve static assets or 404)
  if (!prefix || !APP_ROUTES[prefix]) {
    return next();
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

  // Fetch the actual index.html (SPA root)
  const response = await env.ASSETS.fetch(new URL('/', request.url));

  // Apply rewrites using HTMLRewriter
  return new HTMLRewriter()
    // Title
    .on('title', {
      element(element) {
        element.setInnerContent(meta.title);
      },
    })
    // Open Graph
    .on('meta[property="og:title"]', {
      element(element) {
        element.setAttribute('content', meta.title);
      },
    })
    .on('meta[property="og:description"]', {
      element(element) {
        element.setAttribute('content', meta.description);
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
        element.setAttribute('content', meta.title);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(element) {
        element.setAttribute('content', meta.description);
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
        element.setAttribute('content', meta.description);
      },
    })
    .transform(response);
};
