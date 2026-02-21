import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import LZString from 'lz-string';
import { APP_ROUTES, AppMode, AppRoutePrefix, VALID_MODES } from '@/config/routes';
import { getWindowHash } from '@/utils/window-location';
import { decompressBackup, type BackupPayload } from '@/lib/backup';
import { CompressedData } from '@/types/bill';

interface ParsedUrlState {
  mode: AppMode | null;
  pathParams: Record<string, string>; // e.g., { title: 'KTV', templateId: 'netflix' }
  decodedData: CompressedData | null; // 從 Hash 解密後的 JSON 資料
  rawHash: string | null; // 原始 Hash 字串 (除錯用)
  isLoading: boolean; // 解析中狀態
  error: string | null;
  isEncrypted: boolean; // 是否為加密連結
  encryptedBlob: string | null; // 加密 blob（首碼 1 之後的內容）
  isShareLink: boolean; // URL 含有明文 hash 資料（無論有效與否）
  isBackupLink: boolean; // 是否為備份連結
  backupData: BackupPayload | null; // 解析後的備份資料
}

/**
 * CompressedData schema 驗證（第二層防線）
 * 只有當 parsed data 含有 mo 欄位時才觸發（代表它是 CompressedData 格式）
 * 沒有 mo 的 JSON 可能是舊版格式，跳過驗證以向下相容
 */
function validateCompressedData(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return '分享連結資料格式錯誤';
  const d = data as Record<string, unknown>;
  if (!d.mo) return null; // 沒有 mo → 不是 CompressedData → 跳過驗證

  if (!VALID_MODES.includes(d.mo as typeof VALID_MODES[number])) return '分享連結資料不完整，請聯繫分享者重新取得連結';
  if (typeof d.b !== 'string' || !d.b) return '分享連結資料不完整，請聯繫分享者重新取得連結';
  if (typeof d.a !== 'string' || !d.a) return '分享連結資料不完整，請聯繫分享者重新取得連結';

  if (d.mo === 'bill') {
    const bd = d.bd as Record<string, unknown> | undefined;
    if (!bd || typeof bd !== 'object') return '分帳連結缺少帳單資料，請聯繫分享者重新取得連結';
    if (!Array.isArray(bd.m) || bd.m.length === 0) return '分帳連結缺少成員資料，請聯繫分享者重新取得連結';
    if (!Array.isArray(bd.i) || bd.i.length === 0) return '分帳連結缺少消費項目，請聯繫分享者重新取得連結';
  }

  return null; // 驗證通過
}

/**
 * 核心路由解析器 (Phase 3 Core)
 * 負責將 Clean Path (多層次路徑) 與 Hash Data 翻譯成 App 狀態
 */
export const useUrlParser = () => {
  const pathname = usePathname();
  const [state, setState] = useState<ParsedUrlState>({
    mode: null,
    pathParams: {},
    decodedData: null,
    rawHash: null,
    isLoading: true,
    error: null,
    isEncrypted: false,
    encryptedBlob: null,
    isShareLink: false,
    isBackupLink: false,
    backupData: null,
  });

  const parse = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const currentPath = pathname || window.location.pathname;
      const currentHash = getWindowHash();

      // 1. 解析路徑 (Path Parsing)
      // /b/Title/TemplateId -> ['b', 'Title', 'TemplateId']
      const pathSegments = currentPath.split('/').filter(Boolean);
      const prefix = pathSegments[0] as AppRoutePrefix;

      // 0. 備份連結偵測 — early return
      if (prefix === 'backup') {
        let backupData: BackupPayload | null = null;
        if (currentHash) {
          const dataMatch = currentHash.match(/(?:[?&]|^|#)data=([^&]*)/);
          const rawDataString = dataMatch ? dataMatch[1] || '' : '';
          if (rawDataString.startsWith('0')) {
            backupData = decompressBackup(rawDataString.slice(1));
          }
        }
        setState({
          mode: null,
          pathParams: {},
          decodedData: null,
          rawHash: currentHash,
          isLoading: false,
          error: backupData ? null : (currentHash ? '備份連結資料損毀' : null),
          isEncrypted: false,
          encryptedBlob: null,
          isShareLink: false,
          isBackupLink: true,
          backupData,
        });
        return;
      }

      let mode: AppMode | null = null;
      const pathParams: Record<string, string> = {};

      const routeConfig = APP_ROUTES[prefix];

      if (routeConfig) {
        mode = routeConfig.mode;

        // 根據 routes.ts 的定義，依序提取參數
        routeConfig.segments.forEach((segmentConfig, index) => {
          // pathSegments[0] 是 prefix，所以參數從 index + 1 開始
          const value = pathSegments[index + 1];

          if (value) {
            // 自動 URL Decode (處理中文路徑)
            pathParams[segmentConfig.key] = decodeURIComponent(value);
          }
        });
      }

      // 2. 解析 Hash (Hash Parsing)
      // 支援格式:
      // - /#/?data=... (React Hash Router style)
      // - /#data=... (Simple style)
      // - /#... (Direct LZString, legacy support)

      let decodedData: CompressedData | null = null;
      let rawDataString = '';
      let isEncrypted = false;
      let encryptedBlob: string | null = null;
      let isShareLink = false;
      let error: string | null = null;

      if (currentHash) {
        // 嘗試從 hash 中提取 data 參數
        // Regex 解釋: 尋找 data= 開頭，並捕捉直到下一個 & 或字串結束的內容
        const dataMatch = currentHash.match(/(?:[?&]|^|#)data=([^&]*)/);

        if (dataMatch) {
          rawDataString = dataMatch[1] || '';
        } else {
          // Fallback: 如果沒有 data=，嘗試直接解析整個 hash (去除 #)
          // 這主要為了相容舊版連結或特殊縮短網址
          rawDataString = currentHash.replace(/^#\/?\??/, '');
        }

        if (rawDataString) {
          if (rawDataString.startsWith('1')) {
            // 加密格式：data=1{base64url blob}
            // base64url 只含 A-Za-z0-9-_，遇到第一個非法字元就截止
            // （修正：navigator.share 在某些平台會把分享文字串在 URL 後面）
            isEncrypted = true;
            const blobMatch = rawDataString.slice(1).match(/^[A-Za-z0-9_-]+/);
            encryptedBlob = blobMatch ? blobMatch[0] : '';
            // isShareLink 保持 false — 由 DecryptionChallenge 負責

          } else if (rawDataString.startsWith('0')) {
            // 新版明文格式：data=0{LZString compressed}
            isShareLink = true;
            try {
              const compressed = rawDataString.slice(1);
              const jsonString = LZString.decompressFromEncodedURIComponent(compressed);
              if (jsonString) {
                decodedData = JSON.parse(jsonString) as CompressedData;
                const schemaError = validateCompressedData(decodedData);
                if (schemaError) {
                  error = schemaError;
                  decodedData = null;
                }
              } else {
                error = '分享連結資料損毀，請聯繫分享者重新取得連結';
              }
            } catch (e) {
              console.warn('Failed to parse hash data:', e);
              error = '分享連結資料損毀，請聯繫分享者重新取得連結';
            }

          } else {
            // Legacy 格式：無首碼，直接 LZString 解壓
            isShareLink = true;
            try {
              const jsonString = LZString.decompressFromEncodedURIComponent(rawDataString);
              if (jsonString) {
                decodedData = JSON.parse(jsonString) as CompressedData;
                const schemaError = validateCompressedData(decodedData);
                if (schemaError) {
                  error = schemaError;
                  decodedData = null;
                }
              } else {
                error = '分享連結資料損毀，請聯繫分享者重新取得連結';
              }
            } catch (e) {
              console.warn('Failed to parse hash data:', e);
              error = '分享連結資料損毀，請聯繫分享者重新取得連結';
            }
          }
        }
      }

      setState({
        mode,
        pathParams,
        decodedData,
        rawHash: currentHash,
        isLoading: false,
        error,
        isEncrypted,
        encryptedBlob,
        isShareLink,
        isBackupLink: false,
        backupData: null,
      });

    } catch (err) {
      console.error('URL Parsing Error:', err);
      setState(prev => ({ ...prev, isLoading: false, error: '解析網址時發生錯誤' }));
    }
  }, [pathname]);

  // 當路徑改變時重新解析
  useEffect(() => {
    parse();
  }, [parse]);

  // 監聽 hashchange 事件 (SPA 內 hash 變化但 pathname 不變的情況)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('hashchange', parse);
    return () => window.removeEventListener('hashchange', parse);
  }, [parse]);

  return state;
};
