import banksRaw from '@/data/banks.json';
import { BankExtended, BankStatus } from '../types';

/** 從 banks.json 取得擴充銀行資料（補上預設 status） */
export function getBanks(): BankExtended[] {
  return banksRaw.map((b) => ({
    ...b,
    status: 'no_reports' as BankStatus,
  }));
}

/** 依代碼查詢單一銀行 */
export function getBankByCode(code: string): BankExtended | undefined {
  return getBanks().find((b) => b.code === code);
}
