import { filterBanks } from '../bank-helpers';
import { BankExtended } from '../../types';

const mockBanks: BankExtended[] = [
  { code: '004', name: '臺灣銀行', shortName: '臺灣銀行', status: 'no_reports' },
  { code: '012', name: '台北富邦商業銀行', shortName: '富邦銀行', status: 'verified' },
  { code: '013', name: '國泰世華商業銀行', shortName: '國泰世華', status: 'no_reports' },
  { code: '812', name: '台新國際商業銀行', shortName: '台新銀行', status: 'verified' },
  { code: '822', name: '中國信託商業銀行', shortName: '中國信託', status: 'reported_issues' },
];

describe('filterBanks', () => {
  it('should return all banks when query is empty string', () => {
    const result = filterBanks(mockBanks, '');
    expect(result).toHaveLength(5);
  });

  it('should filter by bank name (full name)', () => {
    const result = filterBanks(mockBanks, '台新');
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('812');
  });

  it('should filter by bank shortName', () => {
    const result = filterBanks(mockBanks, '國泰世華');
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('013');
  });

  it('should filter by bank code', () => {
    const result = filterBanks(mockBanks, '812');
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('812');
  });

  it('should filter by partial code', () => {
    const result = filterBanks(mockBanks, '81');
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('812');
  });

  it('should return empty array when no match', () => {
    const result = filterBanks(mockBanks, 'xyz123');
    expect(result).toHaveLength(0);
  });

  it('should be case-insensitive for potential English input', () => {
    const banksWithEnglish: BankExtended[] = [
      { code: '023', name: 'HSBC Bank', shortName: 'HSBC', status: 'no_reports' },
    ];
    const result = filterBanks(banksWithEnglish, 'hsbc');
    expect(result).toHaveLength(1);
  });

  it('should match multiple banks when query is broad', () => {
    const result = filterBanks(mockBanks, '銀行');
    // 臺灣銀行, 富邦銀行, 台新銀行 in shortName; also 商業銀行 in name
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('should trim whitespace from query', () => {
    const result = filterBanks(mockBanks, '  台新  ');
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('812');
  });

  it('should return all banks when query is only whitespace', () => {
    const result = filterBanks(mockBanks, '   ');
    expect(result).toHaveLength(5);
  });
});
