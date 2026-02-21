import { buildShareUrl } from './url-builder';
import LZString from 'lz-string';
import { getRouteConfig, SEG } from '@/config/routes';
import { decrypt } from './crypto';
import type { CompressedData } from '@/types/bill';

describe('URL Builder (Phase 3 Core)', () => {

  it('should build a Bill Mode URL with strict hash format', () => {
    const mode = 'bill' as const;
    const { prefix } = getRouteConfig(mode);
    const params = { [SEG.TITLE]: '週五KTV', [SEG.TEMPLATE_ID]: 'netflix' };
    const data = { amount: 1000, members: ['A', 'B'] } as unknown as CompressedData;

    const url = buildShareUrl(mode, params, data);

    // 1. 驗證 Path 部分
    expect(url).toContain(`/${prefix}/%E9%80%B1%E4%BA%94KTV/netflix`);

    // 2. 驗證 Hash 格式
    expect(url).toContain('/#/?data=');

    // 3. 驗證 0 首碼 + 資料可還原
    const hashPart = url.split('data=')[1];
    expect(hashPart.startsWith('0')).toBe(true);
    const compressed = hashPart.slice(1);
    const decrypted = JSON.parse(LZString.decompressFromEncodedURIComponent(compressed));
    expect(decrypted).toEqual(data);
  });

  it('should handle Pay Mode without optional params', () => {
    const { prefix } = getRouteConfig('pay');
    const url = buildShareUrl('pay', { [SEG.TITLE]: 'Lunch' }, { amount: 100 } as unknown as CompressedData);

    expect(url).toContain(`/${prefix}/Lunch/#/?data=`);
  });

  it('should handle Pay Mode with numeric pax param', () => {
    const { prefix } = getRouteConfig('pay');
    const url = buildShareUrl('pay', { [SEG.TITLE]: 'Dinner', [SEG.PAX]: 4 }, { total: 2000 } as unknown as CompressedData);

    expect(url).toContain(`/${prefix}/Dinner/4/#/?data=`);
  });

  it('should ignore undefined optional params', () => {
    const { prefix } = getRouteConfig('pay');
    const url = buildShareUrl('pay', { [SEG.TITLE]: 'Dinner' }, { total: 2000 } as unknown as CompressedData);

    expect(url).toContain(`/${prefix}/Dinner/#/?data=`);
    expect(url).not.toContain('undefined');
  });

  // === 邊緣案例測試 (Edge Cases) ===

  it('should throw error for invalid app mode', () => {
    // @ts-expect-error 故意傳入錯誤的 mode 測試防呆
    expect(() => buildShareUrl('invalid_mode', {}, {} as CompressedData)).toThrow('Unknown mode: invalid_mode');
  });

  it('should handle complex data with Emojis and Unicode', () => {
    const complexData = {
      note: 'Dinner 🍜 & Drinks 🍺',
      user: '王大明 (Da-Ming)'
    };
    const url = buildShareUrl('pay', { [SEG.TITLE]: 'Test' }, complexData as unknown as CompressedData);

    // 驗證 0 首碼 + 還原
    const hashPart = url.split('data=')[1];
    expect(hashPart.startsWith('0')).toBe(true);
    const compressed = hashPart.slice(1);
    const decrypted = JSON.parse(LZString.decompressFromEncodedURIComponent(compressed));
    expect(decrypted).toEqual(complexData);
  });
});

describe('URL Builder — Prefix Protocol (Phase 8 Step 2)', () => {

  it('should prefix plaintext data with 0', () => {
    const data = { amount: 300 } as unknown as CompressedData;
    const url = buildShareUrl('pay', { [SEG.TITLE]: 'Test' }, data);

    const hashPart = url.split('data=')[1];
    expect(hashPart[0]).toBe('0');

    // Strip prefix and verify LZString round-trip
    const compressed = hashPart.slice(1);
    const restored = JSON.parse(LZString.decompressFromEncodedURIComponent(compressed));
    expect(restored).toEqual(data);
  });

  it('should build encrypted URL with data=1 prefix', async () => {
    const data = { secret: true } as unknown as CompressedData;
    const url = await buildShareUrl('pay', { [SEG.TITLE]: 'Secret' }, data, 'myPassword');

    expect(url).toContain('/#/?data=1');
    const hashPart = url.split('data=')[1];
    expect(hashPart[0]).toBe('1');

    // blob 部分是 base64url 字元
    const blob = hashPart.slice(1);
    expect(blob.length).toBeGreaterThan(0);
    expect(blob).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('should round-trip encrypted data via decrypt', async () => {
    const originalData = { amount: 999, bank: '004' } as unknown as CompressedData;
    const password = 'strongPass123';

    const url = await buildShareUrl('pay', { [SEG.TITLE]: 'RT' }, originalData, password);

    // Extract blob
    const blob = url.split('data=1')[1];

    // Decrypt blob → get compressed LZString
    const compressed = await decrypt(password, blob);

    // Decompress → parse JSON
    const restored = JSON.parse(LZString.decompressFromEncodedURIComponent(compressed)!);
    expect(restored).toEqual(originalData);
  });

  it('should return sync string when no password', () => {
    const result = buildShareUrl('pay', { [SEG.TITLE]: 'Sync' }, { x: 1 } as unknown as CompressedData);
    expect(typeof result).toBe('string');
    expect(result).not.toBeInstanceOf(Promise);
  });

  it('should return Promise when password provided', () => {
    const result = buildShareUrl('pay', { [SEG.TITLE]: 'Async' }, { x: 1 } as unknown as CompressedData, 'pw');
    expect(result).toBeInstanceOf(Promise);
  });
});
