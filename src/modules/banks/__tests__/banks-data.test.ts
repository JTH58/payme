import banksRaw from '@/data/banks.json';
import { BankExtended, BankStatus } from '../types';

// 將 raw JSON 轉為 BankExtended（加入預設 status）
function toBankExtended(raw: typeof banksRaw): BankExtended[] {
  return raw.map((b) => ({
    ...b,
    status: (b as any).status ?? 'no_reports',
  }));
}

describe('Banks Data Layer', () => {
  const banks = toBankExtended(banksRaw);

  it('should have 266 bank entries', () => {
    expect(banks).toHaveLength(266);
  });

  it('every bank should have required fields: code, name, shortName', () => {
    for (const bank of banks) {
      expect(bank.code).toMatch(/^\d{3}$/);
      expect(bank.name).toBeTruthy();
      expect(bank.shortName).toBeTruthy();
    }
  });

  it('every bank should have a valid status field', () => {
    const validStatuses: BankStatus[] = ['no_reports', 'verified', 'reported_issues'];
    for (const bank of banks) {
      expect(validStatuses).toContain(bank.status);
    }
  });

  it('optional fields should be string or undefined', () => {
    for (const bank of banks) {
      if (bank.appStoreUrl !== undefined) {
        expect(typeof bank.appStoreUrl).toBe('string');
      }
      if (bank.playStoreUrl !== undefined) {
        expect(typeof bank.playStoreUrl).toBe('string');
      }
      if (bank.officialGuideUrl !== undefined) {
        expect(typeof bank.officialGuideUrl).toBe('string');
      }
      if (bank.customerServicePhone !== undefined) {
        expect(typeof bank.customerServicePhone).toBe('string');
      }
    }
  });

  it('bank codes should be unique', () => {
    const codes = banks.map((b) => b.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});
