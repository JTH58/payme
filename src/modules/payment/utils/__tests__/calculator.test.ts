import { calculateSimpleSplit } from '../calculator';
import { SERVICE_CHARGE_MULTIPLIER } from '@/config/constants';

describe('calculateSimpleSplit', () => {
  it('正常均分 — 1000 / 3 人 = 333', () => {
    const result = calculateSimpleSplit('1000', 3, false);
    expect(result).not.toBeNull();
    expect(result!.perPersonAmount).toBe(333);
    expect(result!.totalWithService).toBe(1000);
  });

  it('含服務費 — 1000 * 1.1 = 1100 / 3 = 367', () => {
    const result = calculateSimpleSplit('1000', 3, true);
    expect(result).not.toBeNull();
    expect(result!.totalWithService).toBe(Math.round(1000 * SERVICE_CHARGE_MULTIPLIER));
    expect(result!.perPersonAmount).toBe(367);
  });

  it('金額為 0 → 每人 0 元', () => {
    const result = calculateSimpleSplit('0', 3, false);
    expect(result).not.toBeNull();
    expect(result!.perPersonAmount).toBe(0);
    expect(result!.totalWithService).toBe(0);
  });

  it('金額為非數字 → return null', () => {
    expect(calculateSimpleSplit('abc', 2, false)).toBeNull();
  });

  it('金額為空字串 → return null', () => {
    expect(calculateSimpleSplit('', 2, false)).toBeNull();
  });

  it('1 人均分 → 不除（金額不變）', () => {
    const result = calculateSimpleSplit('500', 1, false);
    expect(result).not.toBeNull();
    expect(result!.perPersonAmount).toBe(500);
  });

  it('comment 格式正確 — 含服務費文字', () => {
    const result = calculateSimpleSplit('1000', 2, true);
    expect(result).not.toBeNull();
    expect(result!.comment).toContain('含服務費');
    expect(result!.comment).toContain('2人');
  });

  it('四捨五入邊界 — 100 / 3 = 33（非 33.33）', () => {
    const result = calculateSimpleSplit('100', 3, false);
    expect(result).not.toBeNull();
    expect(result!.perPersonAmount).toBe(33);
    expect(Number.isInteger(result!.perPersonAmount)).toBe(true);
  });
});
