import LZString from 'lz-string';
import { USER_DATA_KEYS } from '@/config/storage-keys';
import { safeGetItem, safeSetItem } from '@/lib/safe-storage';

export interface BackupPayload {
  v: 1;
  ts: number;
  keys: Record<string, string>;
}

/**
 * 收集 localStorage 中所有使用者資料，組成備份 payload
 */
export function createBackupPayload(): BackupPayload {
  const keys: Record<string, string> = {};
  for (const key of USER_DATA_KEYS) {
    const value = safeGetItem(key);
    if (value !== null) {
      keys[key] = value;
    }
  }
  return { v: 1, ts: Date.now(), keys };
}

/**
 * 將備份 payload 壓縮為 LZString 字串
 */
export function compressBackup(payload: BackupPayload): string {
  const json = JSON.stringify(payload);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * 解壓 LZString 字串為備份 payload，失敗回傳 null
 */
export function decompressBackup(compressed: string): BackupPayload | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const data = JSON.parse(json);
    if (typeof data !== 'object' || data === null) return null;
    if (data.v !== 1) return null;
    if (typeof data.ts !== 'number') return null;
    if (typeof data.keys !== 'object' || data.keys === null) return null;
    return data as BackupPayload;
  } catch {
    return null;
  }
}

/**
 * 產生備份連結 URL
 * 格式: {origin}/backup/#/?data=0{compressed}
 */
export function buildBackupUrl(payload: BackupPayload): string {
  const compressed = compressBackup(payload);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://payme.tw';
  return `${origin}/backup/#/?data=0${compressed}`;
}

/**
 * 將備份 payload 寫入 localStorage
 */
export function restoreBackup(payload: BackupPayload): void {
  for (const [key, value] of Object.entries(payload.keys)) {
    safeSetItem(key, value);
  }
}

/**
 * 檢查 localStorage 中是否已有使用者資料
 */
export function hasExistingUserData(): boolean {
  return USER_DATA_KEYS.some((key) => safeGetItem(key) !== null);
}
