import LZString from 'lz-string';
import {
  createBackupPayload,
  compressBackup,
  decompressBackup,
  buildBackupUrl,
  restoreBackup,
  hasExistingUserData,
  type BackupPayload,
} from '../backup';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});

describe('backup.ts', () => {
  describe('createBackupPayload', () => {
    it('should collect existing user data keys', () => {
      localStorageMock.setItem('payme_data_payment', '{"bankCode":"004"}');
      localStorageMock.setItem('payme_last_mode', 'pay');
      localStorageMock.setItem('payme_accounts', '[{"id":"a1","bankCode":"004","accountNumber":"1234567890","isShared":true}]');
      // 排除的 key 不應被收集
      localStorageMock.setItem('payme_has_visited', 'true');

      const payload = createBackupPayload();

      expect(payload.v).toBe(1);
      expect(typeof payload.ts).toBe('number');
      expect(payload.keys['payme_data_payment']).toBe('{"bankCode":"004"}');
      expect(payload.keys['payme_last_mode']).toBe('pay');
      expect(payload.keys['payme_accounts']).toBeDefined();
      expect(payload.keys['payme_has_visited']).toBeUndefined();
    });

    it('should return empty keys when no user data exists', () => {
      const payload = createBackupPayload();
      expect(Object.keys(payload.keys)).toHaveLength(0);
    });
  });

  describe('compressBackup / decompressBackup round-trip', () => {
    it('should compress and decompress correctly', () => {
      const payload: BackupPayload = {
        v: 1,
        ts: 1700000000000,
        keys: {
          payme_data_payment: '{"bankCode":"004","accountNumber":"1234"}',
          payme_last_mode: 'bill',
        },
      };

      const compressed = compressBackup(payload);
      expect(typeof compressed).toBe('string');
      expect(compressed.length).toBeGreaterThan(0);

      const decompressed = decompressBackup(compressed);
      expect(decompressed).toEqual(payload);
    });
  });

  describe('decompressBackup', () => {
    it('should return null for empty string', () => {
      expect(decompressBackup('')).toBeNull();
    });

    it('should return null for garbage input', () => {
      expect(decompressBackup('not-valid-lzstring!!!')).toBeNull();
    });

    it('should return null for valid JSON but wrong schema (missing v)', () => {
      const json = JSON.stringify({ ts: 123, keys: {} });
      const compressed = LZString.compressToEncodedURIComponent(json);
      expect(decompressBackup(compressed)).toBeNull();
    });

    it('should return null for wrong version', () => {
      const json = JSON.stringify({ v: 2, ts: 123, keys: {} });
      const compressed = LZString.compressToEncodedURIComponent(json);
      expect(decompressBackup(compressed)).toBeNull();
    });
  });

  describe('buildBackupUrl', () => {
    it('should produce correct URL format', () => {
      const payload: BackupPayload = { v: 1, ts: 123, keys: { payme_last_mode: 'pay' } };
      const url = buildBackupUrl(payload);

      expect(url).toContain('/backup/#/?data=0');
      // URL 中的壓縮資料應可以解壓回原始 payload
      const dataMatch = url.match(/data=0(.+)$/);
      expect(dataMatch).not.toBeNull();
      const decompressed = decompressBackup(dataMatch![1]);
      expect(decompressed).toEqual(payload);
    });
  });

  describe('restoreBackup', () => {
    it('should write all keys to localStorage', () => {
      const payload: BackupPayload = {
        v: 1,
        ts: 123,
        keys: {
          payme_data_payment: '{"bankCode":"004"}',
          payme_last_mode: 'pay',
        },
      };

      restoreBackup(payload);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('payme_data_payment', '{"bankCode":"004"}');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('payme_last_mode', 'pay');
    });
  });

  describe('hasExistingUserData', () => {
    it('should return false when no user data', () => {
      expect(hasExistingUserData()).toBe(false);
    });

    it('should return true when user data exists', () => {
      localStorageMock.setItem('payme_data_payment', '{}');
      expect(hasExistingUserData()).toBe(true);
    });

    it('should ignore non-user keys', () => {
      localStorageMock.setItem('payme_has_visited', 'true');
      expect(hasExistingUserData()).toBe(false);
    });
  });
});
