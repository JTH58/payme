import LZString from 'lz-string';
import { APP_ROUTES, AppMode, AppRoutePrefix, RouteConfig } from '@/config/routes';
import { encrypt } from './crypto';
import { CompressedData } from '@/types/bill';

/**
 * 建立分享連結的核心函式
 *
 * @param mode - 應用程式模式 (pay, bill)
 * @param pathParams - 路徑參數 (如 { title: 'KTV', templateId: 'netflix' })
 * @param data - 需要加密在 Hash 中的敏感資料
 * @param password - 選填密碼，提供時回傳 Promise<string>（加密格式）
 * @returns 完整的分享網址
 */
// Overload: no password → sync string
export function buildShareUrl(
  mode: AppMode,
  pathParams: Record<string, string | number | undefined>,
  data: CompressedData
): string;
// Overload: with password → async Promise<string>
export function buildShareUrl(
  mode: AppMode,
  pathParams: Record<string, string | number | undefined>,
  data: CompressedData,
  password: string
): Promise<string>;
// Implementation
export function buildShareUrl(
  mode: AppMode,
  pathParams: Record<string, string | number | undefined>,
  data: CompressedData,
  password?: string
): string | Promise<string> {
  // 1. 找出對應的 Route Config
  const routeEntry = Object.entries(APP_ROUTES).find(
    ([_, config]) => config.mode === mode
  );

  if (!routeEntry) {
    throw new Error(`Unknown mode: ${mode}`);
  }

  const [prefix, config] = routeEntry as [AppRoutePrefix, RouteConfig];

  // 2. 建構路徑 (Path Construction)
  // 依序填入 segments
  const pathParts = [prefix];

  config.segments.forEach((segment) => {
    const value = pathParams[segment.key];
    if (value !== undefined && value !== null && value !== '') {
      // 確保中文被正確編碼
      pathParts.push(encodeURIComponent(String(value)));
    }
  });

  const cleanPath = `/${pathParts.join('/')}`;

  // 3. 建構 Hash (Hash Construction)
  const jsonString = JSON.stringify(data);
  const compressed = LZString.compressToEncodedURIComponent(jsonString);

  // 4. 組合 (在 Browser 環境使用 window.location.origin，Server 端則 fallback)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://payme.tw';

  if (password) {
    // 加密格式：先壓縮再加密 → data=1{base64url blob}
    return encrypt(password, compressed).then((blob) => {
      const hashFragment = `/#/?data=1${blob}`;
      return `${origin}${cleanPath}${hashFragment}`;
    });
  }

  // 明文格式：data=0{compressed}
  const hashFragment = `/#/?data=0${compressed}`;
  return `${origin}${cleanPath}${hashFragment}`;
}
