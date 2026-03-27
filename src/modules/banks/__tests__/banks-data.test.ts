import { getBanks } from '../utils/get-banks';
import { BankStatus } from '../types';

describe('Banks Data Layer', () => {
  const banks = getBanks();

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
      expect(bank.seo.seoIntro).toBeTruthy();
      expect(bank.seo.usageNotes.length).toBeGreaterThan(0);
      expect(bank.seo.faqs.length).toBeGreaterThan(0);
    }
  });

  it('bank codes should be unique', () => {
    const codes = banks.map((b) => b.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});
