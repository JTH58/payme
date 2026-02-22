import { createShortLink, ShortenerError } from '../shortener-api';

// Mock shortener-crypto
jest.mock('../shortener-crypto', () => ({
  encryptForShortener: jest.fn().mockResolvedValue({
    ciphertext: 'mock-ciphertext',
    serverKey: 'mock-server-key',
    clientKey: 'Ab1x',
  }),
}));

// Mock fetch
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('shortener-api', () => {
  describe('createShortLink', () => {
    test('成功時應回傳 https://s.payme.tw/{code}#{clientKey} 格式', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ shortCode: 'abc123' }),
      });

      const result = await createShortLink('https://payme.tw/pay/test', 'simple');
      expect(result).toBe('https://s.payme.tw/abc123#Ab1x');
    });

    test('POST body 應包含 ciphertext 和 serverKey（不含 clientKey）', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ shortCode: 'xyz' }),
      });

      await createShortLink('https://payme.tw/pay/test', 'simple');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://s.payme.tw/api/shorten',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ciphertext: 'mock-ciphertext',
            serverKey: 'mock-server-key',
            mode: 'simple',
          }),
        })
      );

      // 確認 body 中不含 clientKey
      const bodyStr = mockFetch.mock.calls[0][1].body;
      expect(bodyStr).not.toContain('clientKey');
    });

    test('403 錯誤應拋出 ShortenerError', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

      try {
        await createShortLink('https://payme.tw', 'simple');
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ShortenerError);
        expect((err as Error).message).toMatch(/403/);
      }
    });

    test('429 錯誤應拋出 ShortenerError 並提示頻率限制', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

      await expect(createShortLink('https://payme.tw', 'simple')).rejects.toThrow(/頻繁/);
    });

    test('400 錯誤應拋出 ShortenerError', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });

      await expect(createShortLink('https://payme.tw', 'simple')).rejects.toThrow(/格式錯誤/);
    });

    test('網路錯誤應拋出 ShortenerError 並提示網路問題', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      try {
        await createShortLink('https://payme.tw', 'simple');
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ShortenerError);
        expect((err as Error).message).toMatch(/網路/);
      }
    });

    test('ShortenerError 應包含 statusCode', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      try {
        await createShortLink('https://payme.tw', 'simple');
      } catch (err) {
        expect(err).toBeInstanceOf(ShortenerError);
        expect((err as ShortenerError).statusCode).toBe(500);
      }
    });
  });
});
