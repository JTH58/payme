import { renderHook } from '@testing-library/react';
import { useUrlParser } from './use-url-parser';
import * as navigation from 'next/navigation';
import * as windowLocation from '@/utils/window-location';
import LZString from 'lz-string';
import { getRouteConfig, SEG } from '@/config/routes';

/** 根據 AppMode 取得路由前綴 */
const p = (mode: 'pay' | 'bill') => getRouteConfig(mode).prefix;

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock utils/window-location
jest.mock('@/utils/window-location', () => ({
  getWindowHash: jest.fn(),
}));

describe('useUrlParser Hook Integration Test', () => {
  const mockUsePathname = navigation.usePathname as jest.Mock;
  const mockGetWindowHash = windowLocation.getWindowHash as jest.Mock;

  // Helper: 模擬瀏覽器環境
  // 這次我們只需要 mock 兩個函數回傳值，完全不需要動全域物件
  const setupLocation = (path: string, hash: string = '') => {
    mockUsePathname.mockReturnValue(path);
    mockGetWindowHash.mockReturnValue(hash);
  };

  // Helper: 產生壓縮資料
  const generateHash = (data: any) => {
    const json = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(json);
    return `data=${compressed}`;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // === 測試案例 1: 基礎路徑解析 ===
  it('should parse pay mode correctly (Phase 3 Core)', () => {
    setupLocation(`/${p('pay')}/聚餐費`);

    const { result } = renderHook(() => useUrlParser());

    expect(result.current.mode).toBe('pay');
    expect(result.current.pathParams).toEqual({
      [SEG.TITLE]: '聚餐費'
    });
    expect(result.current.isLoading).toBe(false);
  });

  // === 測試案例 2: 多層次參數解析 (Bill Mode) ===
  it('should parse multi-level path params correctly', () => {
    setupLocation(`/${p('bill')}/週五KTV局/netflix_red`);

    const { result } = renderHook(() => useUrlParser());

    expect(result.current.mode).toBe('bill');
    expect(result.current.pathParams).toEqual({
      [SEG.TITLE]: '週五KTV局',
      [SEG.TEMPLATE_ID]: 'netflix_red'
    });
  });

  // === 測試案例 3: Hash 資料解密 (Happy Path) ===
  it('should extract and decrypt hash data', () => {
    const mockData = { amount: 500, bank: '822' };
    const hashString = generateHash(mockData);
    
    // 模擬複雜的 hash 格式: #/?data=...
    setupLocation(`/${p('pay')}/Demo`, `#/?${hashString}`);
    
    const { result } = renderHook(() => useUrlParser());

    expect(result.current.decodedData).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  // === 測試案例 4: 混合情境 (Path + Query + Hash) ===
  it('should handle Path, Query, and Hash simultaneously without interference', () => {
    const mockData = { items: [{ name: 'Beef', price: 200 }] };
    const hashString = generateHash(mockData);

    // 在測試中，Query 被 next/navigation 處理，Hash 被 getWindowHash 處理
    // 所以我們只要確保 getWindowHash 回傳正確的 hash 即可
    setupLocation(`/${p('bill')}/燒肉`, `#${hashString}`);

    const { result } = renderHook(() => useUrlParser());

    // 驗證 Path 層
    expect(result.current.mode).toBe('bill');
    expect(result.current.pathParams).toEqual({ [SEG.TITLE]: '燒肉' });

    // 驗證 Hash 層
    expect(result.current.decodedData).toEqual(mockData);
  });

  // === 測試案例 5: 錯誤處理 (無效的 Hash) ===
  it('should handle invalid hash gracefully', () => {
    setupLocation(`/${p('pay')}/test`, '#data=InvalidGibberish');
    
    const { result } = renderHook(() => useUrlParser());

    expect(result.current.decodedData).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  // === 測試案例 6: 選填參數測試 (Pay Mode with optional PAX) ===
  it('should handle optional path params', () => {
    setupLocation(`/${p('pay')}/Lunch`);

    const { result } = renderHook(() => useUrlParser());

    expect(result.current.mode).toBe('pay');
    expect(result.current.pathParams).toEqual({
      [SEG.TITLE]: 'Lunch'
    });
    expect(result.current.pathParams[SEG.PAX]).toBeUndefined();
  });

  // === 測試案例 7: 中文編碼處理 ===
  it('should auto-decode URI components in path', () => {
    // 瀏覽器實際上會給出編碼過的路徑
    setupLocation(`/${p('pay')}/%E4%B8%AD%E6%96%87%E6%B8%AC%E8%A9%A6`);

    const { result } = renderHook(() => useUrlParser());

    expect(result.current.pathParams).toEqual({
      [SEG.TITLE]: '中文測試'
    });
  });

  // === 邊緣案例測試 (Edge Cases) ===
  
  it('should handle unknown route prefixes gracefully', () => {
    setupLocation('/unknown/route');
    
    const { result } = renderHook(() => useUrlParser());

    expect(result.current.mode).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should support legacy hash format without query prefix (#data=...)', () => {
    const mockData = { legacy: true };
    const hashString = generateHash(mockData); // data=...
    setupLocation(`/${p('pay')}/Legacy`, `#${hashString}`); // No /?
    
    const { result } = renderHook(() => useUrlParser());

    expect(result.current.decodedData).toEqual(mockData);
  });

  it('should support direct LZString hash (no data= prefix)', () => {
    // 模擬最古老的格式: /#EncodedString
    const mockData = { veryOld: true };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(mockData));
    setupLocation(`/${p('pay')}/Old`, `#${compressed}`);

    const { result } = renderHook(() => useUrlParser());

    expect(result.current.decodedData).toEqual(mockData);
  });

  // === 首碼協議測試 (Prefix Protocol — Phase 8 Step 2) ===

  // 產生帶首碼 0 的新版明文 hash
  const generateHashV2 = (data: any) => {
    const json = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(json);
    return `data=0${compressed}`;
  };

  it('should parse new plaintext format (data=0...)', () => {
    const mockData = { amount: 500, bank: '822' };
    setupLocation(`/${p('pay')}/Test`, `#/?${generateHashV2(mockData)}`);

    const { result } = renderHook(() => useUrlParser());

    expect(result.current.decodedData).toEqual(mockData);
    expect(result.current.isEncrypted).toBe(false);
    expect(result.current.encryptedBlob).toBeNull();
  });

  it('should detect encrypted data (data=1...)', () => {
    const fakeBlob = 'aBcDeFgHiJkLmNoPqRsTuVwXyZ012345';
    setupLocation(`/${p('pay')}/Secret`, `#/?data=1${fakeBlob}`);

    const { result } = renderHook(() => useUrlParser());

    expect(result.current.isEncrypted).toBe(true);
    expect(result.current.encryptedBlob).toBe(fakeBlob);
  });

  it('should set decodedData to null for encrypted data', () => {
    const fakeBlob = 'aBcDeFgHiJkLmNoPqRsTuVwXyZ012345';
    setupLocation(`/${p('pay')}/Secret`, `#/?data=1${fakeBlob}`);

    const { result } = renderHook(() => useUrlParser());

    expect(result.current.decodedData).toBeNull();
  });

  it('should default isEncrypted to false for legacy format', () => {
    const mockData = { legacy: true };
    const hashString = generateHash(mockData);
    setupLocation(`/${p('pay')}/Legacy`, `#/?${hashString}`);

    const { result } = renderHook(() => useUrlParser());

    expect(result.current.isEncrypted).toBe(false);
    expect(result.current.encryptedBlob).toBeNull();
    expect(result.current.decodedData).toEqual(mockData);
  });

  it('should default isEncrypted to false when no hash', () => {
    setupLocation(`/${p('pay')}/NoHash`);

    const { result } = renderHook(() => useUrlParser());

    expect(result.current.isEncrypted).toBe(false);
    expect(result.current.encryptedBlob).toBeNull();
  });

  // === 加密 blob 淨化 (Encrypted Blob Sanitization) ===

  describe('加密 blob 淨化：剔除分享文字殘留', () => {
    it('分享文字被串在 blob 後面（%20 分隔）應被剔除', () => {
      const pureBlob = 'S5uBABDHkdqLm7h7ggvaEGTXL-HLH3fBg927fPXHwAXs0C4TSnpsCIOrYsLxM7wYZaj6LIuWQ0lDNsKBzq7bQAeh6d8hD6tm0W6iAOYF3c250VxrZFoCd5NB2dBM_wIMh385kmnjdD4XUodzS9Ur0A_H40J2lHlP7KcxgzE6DU79t_ns2nxui4Q3JW4ezrgBOfmFxCTCeld4srYy00Ns80gVDb0c8pobATlH7Ww';
      const trailingGarbage = '%20%E9%8A%80%E8%A1%8C%EF%BC%9A004%20%E8%87%BA%E7%81%A3';
      setupLocation(`/${p('pay')}/Test`, `#/?data=1${pureBlob}${trailingGarbage}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.isEncrypted).toBe(true);
      expect(result.current.encryptedBlob).toBe(pureBlob);
    });

    it('分享文字以空格分隔（browser 已解碼）應被剔除', () => {
      const pureBlob = 'abcDEF012_-xyz';
      setupLocation(`/${p('pay')}/Test`, `#/?data=1${pureBlob} 銀行：004 臺灣銀行`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.isEncrypted).toBe(true);
      expect(result.current.encryptedBlob).toBe(pureBlob);
    });

    it('正常加密連結（無殘留）應不受影響', () => {
      const pureBlob = 'aBcDeFgHiJkLmNoPqRsTuVwXyZ012345-_';
      setupLocation(`/${p('pay')}/Secret`, `#/?data=1${pureBlob}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.isEncrypted).toBe(true);
      expect(result.current.encryptedBlob).toBe(pureBlob);
    });

    it('blob 為空（data=1 無內容）應設 encryptedBlob 為空字串', () => {
      setupLocation(`/${p('pay')}/Test`, '#/?data=1');

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.isEncrypted).toBe(true);
      expect(result.current.encryptedBlob).toBe('');
    });
  });

  // === 分享連結錯誤處理 (Share Link Error Handling) ===

  describe('分享連結錯誤處理', () => {
    it('新格式 (0...) 解壓失敗應設定 error', () => {
      setupLocation(`/${p('bill')}/friday`, '#/?data=0InvalidData');

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.error).not.toBeNull();
      expect(result.current.isShareLink).toBe(true);
      expect(result.current.decodedData).toBeNull();
    });

    it('Legacy 格式解壓失敗應設定 error', () => {
      setupLocation(`/${p('bill')}/friday`, '#data=Gibberish');

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.error).not.toBeNull();
      expect(result.current.isShareLink).toBe(true);
      expect(result.current.decodedData).toBeNull();
    });

    it('解壓成功但 JSON parse 失敗應設定 error', () => {
      const notJson = 'not json {]';
      const compressed = LZString.compressToEncodedURIComponent(notJson);
      setupLocation(`/${p('bill')}/friday`, `#/?data=0${compressed}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.error).not.toBeNull();
      expect(result.current.isShareLink).toBe(true);
    });

    it('無 hash 時 isShareLink 應為 false', () => {
      setupLocation(`/${p('pay')}/test`, '');

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.isShareLink).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('加密連結 isShareLink 應為 false', () => {
      setupLocation(`/${p('pay')}/Secret`, '#/?data=1abcdef123456');

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.isShareLink).toBe(false);
      expect(result.current.isEncrypted).toBe(true);
    });

    it('有效明文連結 isShareLink 應為 true', () => {
      const mockData = { amount: 500, bank: '822' };
      setupLocation(`/${p('pay')}/Test`, `#/?${generateHashV2(mockData)}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.isShareLink).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.decodedData).toEqual(mockData);
    });

    it('超短損毀資料 (如 0N4Ig) 應設定 error', () => {
      setupLocation(`/${p('bill')}/friday`, '#/?data=0N4Ig');

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.error).not.toBeNull();
      expect(result.current.isShareLink).toBe(true);
    });

    it('空 data 參數不視為分享連結', () => {
      setupLocation(`/${p('pay')}/test`, '#/?data=');

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.isShareLink).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  // === CompressedData Schema 驗證 (第二層防線) ===

  describe('CompressedData schema 驗證', () => {
    // Helper: 產生完整有效的 bill CompressedData
    const validBillData = {
      b: '822', a: '1234567890', m: '0', c: '', mo: 'bill' as const,
      bd: {
        t: '週五聚餐',
        m: ['Alice', 'Bob'],
        i: [{ n: '披薩', p: 300, o: [0, 1] }],
        s: false,
      },
    };

    const validPaymentData = {
      b: '004', a: '9876543210', m: '500', c: '午餐', mo: 'pay' as const,
    };

    const validPaymentData2 = {
      b: '004', a: '9876543210', m: '1000', c: '房租', mo: 'pay' as const,
    };

    it('完整有效的 bill CompressedData 應通過驗證', () => {
      setupLocation(`/${p('bill')}/friday`, `#/?${generateHashV2(validBillData)}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.error).toBeNull();
      expect(result.current.decodedData).toEqual(validBillData);
      expect(result.current.isShareLink).toBe(true);
    });

    it('完整有效的 payment CompressedData 應通過驗證', () => {
      setupLocation(`/${p('pay')}/test`, `#/?${generateHashV2(validPaymentData)}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.error).toBeNull();
      expect(result.current.decodedData).toEqual(validPaymentData);
    });

    it('完整有效的 payment CompressedData (另一筆) 應通過驗證', () => {
      setupLocation(`/${p('pay')}/test`, `#/?${generateHashV2(validPaymentData2)}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.error).toBeNull();
      expect(result.current.decodedData).toEqual(validPaymentData2);
    });

    it('JSON 合法但缺 mo 欄位 → 不視為 CompressedData，不驗證（向下相容）', () => {
      const noMoData = { amount: 500, bank: '822' };
      setupLocation(`/${p('pay')}/test`, `#/?${generateHashV2(noMoData)}`);

      const { result } = renderHook(() => useUrlParser());

      // 沒有 mo 欄位 → 不是 CompressedData → 不做 schema 驗證 → 照常回傳
      expect(result.current.error).toBeNull();
      expect(result.current.decodedData).toEqual(noMoData);
    });

    it('有 mo 但缺 b (bankCode) → error', () => {
      const noBankCode = { a: '123', m: '500', c: '', mo: 'pay' };
      setupLocation(`/${p('pay')}/test`, `#/?${generateHashV2(noBankCode)}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.error).not.toBeNull();
      expect(result.current.decodedData).toBeNull();
    });

    it('有 mo 但缺 a (account) → error', () => {
      const noAccount = { b: '822', m: '500', c: '', mo: 'pay' };
      setupLocation(`/${p('pay')}/test`, `#/?${generateHashV2(noAccount)}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.error).not.toBeNull();
      expect(result.current.decodedData).toBeNull();
    });

    it('mo=bill 但缺 bd → error', () => {
      const billNoBd = { b: '822', a: '123', m: '0', c: '', mo: 'bill' };
      setupLocation(`/${p('bill')}/friday`, `#/?${generateHashV2(billNoBd)}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.error).not.toBeNull();
      expect(result.current.decodedData).toBeNull();
    });

    it('mo=bill 但 bd.m 空陣列（無成員）→ error', () => {
      const emptyMembers = {
        ...validBillData,
        bd: { ...validBillData.bd, m: [] },
      };
      setupLocation(`/${p('bill')}/friday`, `#/?${generateHashV2(emptyMembers)}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.error).not.toBeNull();
      expect(result.current.decodedData).toBeNull();
    });

    it('mo=bill 但 bd.i 空陣列（無項目）→ error', () => {
      const emptyItems = {
        ...validBillData,
        bd: { ...validBillData.bd, i: [] },
      };
      setupLocation(`/${p('bill')}/friday`, `#/?${generateHashV2(emptyItems)}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.error).not.toBeNull();
      expect(result.current.decodedData).toBeNull();
    });

    it('mo 為無效值 → error', () => {
      const invalidMode = { b: '822', a: '123', m: '0', c: '', mo: 'unknown' };
      setupLocation(`/${p('pay')}/test`, `#/?${generateHashV2(invalidMode)}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.error).not.toBeNull();
      expect(result.current.decodedData).toBeNull();
    });
  });

  // === 備份連結偵測 (Backup Link Detection) ===

  describe('備份連結偵測', () => {
    it('/backup path + 有效 data → isBackupLink: true + backupData', () => {
      const payload = { v: 1, ts: 123, keys: { payme_last_mode: 'simple' } };
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
      setupLocation('/backup', `#/?data=0${compressed}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.isBackupLink).toBe(true);
      expect(result.current.backupData).toEqual(payload);
      expect(result.current.isShareLink).toBe(false);
      expect(result.current.mode).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('/backup path + 無效 data → isBackupLink: true + backupData: null + error', () => {
      setupLocation('/backup', '#/?data=0InvalidData');

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.isBackupLink).toBe(true);
      expect(result.current.backupData).toBeNull();
      expect(result.current.error).not.toBeNull();
    });

    it('/backup path + 無 hash → isBackupLink: true, no error', () => {
      setupLocation('/backup', '');

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.isBackupLink).toBe(true);
      expect(result.current.backupData).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('一般分享連結不受備份偵測影響', () => {
      const mockData = { amount: 500, bank: '822' };
      setupLocation(`/${p('pay')}/Test`, `#/?${generateHashV2(mockData)}`);

      const { result } = renderHook(() => useUrlParser());

      expect(result.current.isBackupLink).toBe(false);
      expect(result.current.backupData).toBeNull();
      expect(result.current.isShareLink).toBe(true);
    });
  });
});