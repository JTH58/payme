import { safeGetItem, safeSetItem, generateId } from '@/lib/safe-storage';
import { STORAGE_KEY } from '@/config/storage-keys';

export interface AccountEntry {
  id: string;
  bankCode: string;
  accountNumber: string;
  isShared: boolean;
}
const MODE_KEYS = ['payme_data_general', 'payme_data_simple', 'payme_data_bill'] as const;

/**
 * 從舊的 per-mode localStorage 資料遷移帳戶到統一的 payme_accounts key
 * - 若 payme_accounts 已存在 → 跳過
 * - 從 3 個 mode key 提取 accounts[]，以 bankCode-accountNumber dedup
 * - isShared 取 OR（任一模式為 true 即 true）
 * - 若無 accounts[]，fallback 讀 top-level bankCode/accountNumber
 * - 寫入 payme_accounts 並清除各 mode key 中的 accounts 欄位
 */
export function migrateAccountsIfNeeded(): AccountEntry[] {
  // 已遷移 → 跳過
  const existing = safeGetItem(STORAGE_KEY.accounts);
  if (existing !== null) {
    try {
      return JSON.parse(existing) as AccountEntry[];
    } catch {
      return [];
    }
  }

  // 收集所有帳戶，以 key dedup
  const accountMap = new Map<string, AccountEntry>();

  for (const modeKey of MODE_KEYS) {
    const raw = safeGetItem(modeKey);
    if (!raw) continue;

    try {
      const data = JSON.parse(raw);

      // 嘗試從 accounts[] 提取
      if (Array.isArray(data.accounts) && data.accounts.length > 0) {
        for (const acc of data.accounts) {
          if (!acc.bankCode || !acc.accountNumber) continue;
          const dedupKey = `${acc.bankCode}-${acc.accountNumber}`;
          const existingEntry = accountMap.get(dedupKey);
          if (existingEntry) {
            // OR 邏輯：任一模式為 true → true
            existingEntry.isShared = existingEntry.isShared || Boolean(acc.isShared);
          } else {
            accountMap.set(dedupKey, {
              id: acc.id || generateId(),
              bankCode: acc.bankCode,
              accountNumber: acc.accountNumber,
              isShared: acc.isShared !== false, // 預設 true
            });
          }
        }
      } else if (data.bankCode && data.accountNumber) {
        // Fallback: top-level bankCode/accountNumber
        const dedupKey = `${data.bankCode}-${data.accountNumber}`;
        if (!accountMap.has(dedupKey)) {
          accountMap.set(dedupKey, {
            id: generateId(),
            bankCode: data.bankCode,
            accountNumber: data.accountNumber,
            isShared: true,
          });
        }
      }

      // 清除舊 mode key 中的 accounts 欄位
      if (data.accounts) {
        delete data.accounts;
        safeSetItem(modeKey, JSON.stringify(data));
      }
    } catch {
      // 解析失敗 → 跳過此 key
    }
  }

  const accounts = Array.from(accountMap.values());

  // 寫入統一 key（即使為空陣列也寫入，標記遷移完成）
  safeSetItem(STORAGE_KEY.accounts, JSON.stringify(accounts));

  return accounts;
}
