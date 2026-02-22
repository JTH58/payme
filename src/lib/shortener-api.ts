import { SHORTENER_API_URL } from '@/config/constants';
import { encryptForShortener } from './shortener-crypto';

export class ShortenerError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'ShortenerError';
  }
}

/**
 * 建立加密短連結
 * 1. 加密 URL → { ciphertext, serverKey, clientKey }
 * 2. POST /api/shorten → { shortCode }
 * 3. 回傳 https://s.payme.tw/{shortCode}#{clientKey}
 */
export async function createShortLink(url: string): Promise<string> {
  const { ciphertext, serverKey, clientKey } = await encryptForShortener(url);

  let res: Response;
  try {
    res = await fetch(`${SHORTENER_API_URL}/api/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ciphertext, serverKey }),
    });
  } catch {
    throw new ShortenerError('網路連線失敗，請檢查網路後重試');
  }

  if (!res.ok) {
    const msg =
      res.status === 403
        ? '短網址服務暫時無法使用（403）'
        : res.status === 429
          ? '請求過於頻繁，請稍後再試'
          : res.status === 400
            ? '請求格式錯誤，請重試'
            : `短網址服務發生錯誤（${res.status}）`;
    throw new ShortenerError(msg, res.status);
  }

  const data: { shortCode: string } = await res.json();
  return `${SHORTENER_API_URL}/${data.shortCode}#${clientKey}`;
}
