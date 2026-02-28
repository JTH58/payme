import {
  generateClientKey,
  deriveEncKey,
  encryptPayload,
  decryptPayload,
  encryptForShortener,
} from '../shortener-crypto';

describe('shortener-crypto', () => {
  // ---------------------------------------------------------------------------
  // generateClientKey
  // ---------------------------------------------------------------------------
  describe('generateClientKey', () => {
    test('應產生 4 字元字串', () => {
      expect(generateClientKey()).toHaveLength(4);
    });

    test('所有字元應為英數字', () => {
      const key = generateClientKey();
      expect(key).toMatch(/^[A-Za-z0-9]{4}$/);
    });

    test('連續產生應有隨機性（不完全相同）', () => {
      const keys = new Set(Array.from({ length: 20 }, () => generateClientKey()));
      // 20 次至少應有 2 個不同值
      expect(keys.size).toBeGreaterThan(1);
    });
  });

  // ---------------------------------------------------------------------------
  // deriveEncKey
  // ---------------------------------------------------------------------------
  describe('deriveEncKey', () => {
    test('應產生 AES-GCM CryptoKey', async () => {
      const clientKey = generateClientKey();
      const cryptoKey = await deriveEncKey(clientKey);

      expect(cryptoKey.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 });
      expect(cryptoKey.usages).toContain('encrypt');
      expect(cryptoKey.usages).toContain('decrypt');
    });

    test('不同的 clientKey 應產生不同的密鑰', async () => {
      const key1 = await deriveEncKey('aaaa');
      const key2 = await deriveEncKey('bbbb');

      const raw1 = await globalThis.crypto.subtle.exportKey('raw', key1);
      const raw2 = await globalThis.crypto.subtle.exportKey('raw', key2);

      expect(Buffer.from(raw1).equals(Buffer.from(raw2))).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // encrypt / decrypt round-trip
  // ---------------------------------------------------------------------------
  describe('encryptForShortener round-trip', () => {
    test('加密後解密應還原原始 URL', async () => {
      const url = 'https://payme.tw/pay/test#/?data=0abcdef123456';
      const { ciphertext, clientKey } = await encryptForShortener(url);

      const key = await deriveEncKey(clientKey);
      const decrypted = await decryptPayload(ciphertext, key);
      expect(decrypted).toBe(url);
    });

    test('中文 URL 應正確加解密', async () => {
      const url = 'https://payme.tw/bill/週五燒肉局#/?data=0xyz';
      const { ciphertext, clientKey } = await encryptForShortener(url);

      const key = await deriveEncKey(clientKey);
      const decrypted = await decryptPayload(ciphertext, key);
      expect(decrypted).toBe(url);
    });

    test('超長 URL（1000+ 字元）應正確加解密', async () => {
      const url = 'https://payme.tw/pay/test#/?data=0' + 'a'.repeat(1000);
      const { ciphertext, clientKey } = await encryptForShortener(url);

      const key = await deriveEncKey(clientKey);
      const decrypted = await decryptPayload(ciphertext, key);
      expect(decrypted).toBe(url);
    });

    test('錯誤的 clientKey 無法解密', async () => {
      const url = 'https://payme.tw/pay/test#/?data=0abc';
      const { ciphertext } = await encryptForShortener(url);

      const wrongKey = await deriveEncKey('ZZZZ');
      await expect(decryptPayload(ciphertext, wrongKey)).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // encryptForShortener output structure
  // ---------------------------------------------------------------------------
  describe('encryptForShortener output', () => {
    test('應包含 ciphertext 和 clientKey，不含 serverKey', async () => {
      const result = await encryptForShortener('https://payme.tw');
      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('clientKey');
      expect(result).not.toHaveProperty('serverKey');
    });

    test('clientKey 應為 4 字元英數', async () => {
      const { clientKey } = await encryptForShortener('https://payme.tw');
      expect(clientKey).toMatch(/^[A-Za-z0-9]{4}$/);
    });

    test('ciphertext 應為 base64url 格式', async () => {
      const { ciphertext } = await encryptForShortener('https://payme.tw');
      expect(ciphertext).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });
});
