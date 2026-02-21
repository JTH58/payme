import { BankExtended } from '../types';

/**
 * 篩選銀行列表 — 支援名稱、簡稱、代碼模糊搜尋
 */
export function filterBanks(banks: BankExtended[], query: string): BankExtended[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return banks;

  return banks.filter(
    (bank) =>
      bank.name.toLowerCase().includes(trimmed) ||
      bank.shortName.toLowerCase().includes(trimmed) ||
      bank.code.includes(trimmed)
  );
}
