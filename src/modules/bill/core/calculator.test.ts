import { calculateMemberAmount } from './calculator';
import { BillData } from '@/types/bill';

describe('Bill Calculator', () => {
  const mockBillData: BillData = {
    t: 'Test Bill',
    m: ['Alice', 'Bob', 'Charlie'],
    i: [
      { n: 'Item 1', p: 300, o: [0, 1] }, // 300 / 2 = 150 each (Alice, Bob)
      { n: 'Item 2', p: 100, o: [2] },    // 100 / 1 = 100 each (Charlie)
      { n: 'Item 3', p: 90, o: [0, 1, 2] } // 90 / 3 = 30 each (All)
    ],
    s: false
  };

  test('應正確計算 Alice 的金額 (無服務費)', () => {
    // Alice shares Item 1 (150) and Item 3 (30) = 180
    const amount = calculateMemberAmount(mockBillData, 0);
    expect(amount).toBe(180);
  });

  test('應正確計算 Bob 的金額 (無服務費)', () => {
    // Bob shares Item 1 (150) and Item 3 (30) = 180
    const amount = calculateMemberAmount(mockBillData, 1);
    expect(amount).toBe(180);
  });

  test('應正確計算 Charlie 的金額 (無服務費)', () => {
    // Charlie shares Item 2 (100) and Item 3 (30) = 130
    const amount = calculateMemberAmount(mockBillData, 2);
    expect(amount).toBe(130);
  });

  test('應正確計算包含服務費的金額 (+10%)', () => {
    const dataWithServiceCharge: BillData = {
      ...mockBillData,
      s: true
    };
    
    // Alice: 180 * 1.1 = 198
    expect(calculateMemberAmount(dataWithServiceCharge, 0)).toBe(198);
    // Charlie: 130 * 1.1 = 143
    expect(calculateMemberAmount(dataWithServiceCharge, 2)).toBe(143);
  });

  test('應正確處理四捨五入', () => {
    const data: BillData = {
      t: 'Round Test',
      m: ['A', 'B', 'C'],
      i: [
        { n: 'Item', p: 10, o: [0, 1, 2] } // 10 / 3 = 3.333...
      ],
      s: false
    };

    // 3.333 -> 3
    expect(calculateMemberAmount(data, 0)).toBe(3);

    const data2: BillData = {
        t: 'Round Test 2',
        m: ['A', 'B'],
        i: [
          { n: 'Item', p: 5, o: [0, 1] } // 5 / 2 = 2.5
        ],
        s: false
      };
      
    // 2.5 -> 3 (Math.round rounds .5 up)
    expect(calculateMemberAmount(data2, 0)).toBe(3);
  });

  test('若項目無人認領，不應計入', () => {
    const data: BillData = {
        t: 'Empty Test',
        m: ['A'],
        i: [
          { n: 'Item', p: 100, o: [] }
        ],
        s: false
    };
    expect(calculateMemberAmount(data, 0)).toBe(0);
  });

  test('若輸入無效資料應回傳 0', () => {
      // @ts-ignore
      expect(calculateMemberAmount(null, 0)).toBe(0);
      // @ts-ignore
      expect(calculateMemberAmount({ i: [] }, -1)).toBe(0);
  });
});
