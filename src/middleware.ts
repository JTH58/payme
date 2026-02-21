import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware — 本地開發用 SPA 路由重寫
 *
 * 生產環境由 Cloudflare Edge Middleware (functions/_middleware.ts) 處理
 * /pay/*, /bill/* 路徑的 OG Tag 注入與 SPA Shell 回傳。
 *
 * 此 middleware 僅在 `next dev` 時生效，讓本地開發也能正確載入
 * 分享連結路徑（例如 /bill/friday/#/?data=...）。
 *
 * 注意：`output: 'export'` 建置時此 middleware 會被忽略。
 */

const KNOWN_PREFIXES = ['pay', 'bill', 'backup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split('/').filter(Boolean)[0];

  if (firstSegment && KNOWN_PREFIXES.includes(firstSegment)) {
    // 重寫到根頁面，保留原始 URL（hash 由瀏覽器處理，不會傳到伺服器）
    return NextResponse.rewrite(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // 只匹配 /pay/*, /bill/*, /backup/* 路徑
  matcher: ['/(pay|bill|backup)/:path*'],
};
