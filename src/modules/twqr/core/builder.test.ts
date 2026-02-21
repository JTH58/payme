import { createTwqrString, TwqrData } from './builder';

describe('createTwqrString', () => {
  const baseData: TwqrData = {
    bankCode: '822',
    accountNumber: '123456789012',
  };

  test('應產生正確的基本 TWQR 字串格式', () => {
    const result = createTwqrString(baseData);
    const decoded = decodeURIComponent(result);
    
    // 檢查基本結構
    expect(decoded).toContain('TWQRP://');
    expect(decoded).toContain('個人轉帳');
    expect(decoded).toContain('158/02/V1');
    
    // 檢查必要參數
    expect(decoded).toContain('D5=822');
    expect(decoded).toContain('D6=0000123456789012'); // 自動補零至 16 碼
    expect(decoded).toContain('D10=901'); // 幣別
  });

  test('應正確處理金額 (元轉分)', () => {
    const dataWithAmount = { ...baseData, amount: 500 };
    const result = createTwqrString(dataWithAmount);
    const decoded = decodeURIComponent(result);
    
    // 500 元 * 100 = 50000 分
    expect(decoded).toContain('D1=50000');
  });

  test('應正確處理小數點金額 (四捨五入)', () => {
    const dataWithDecimal = { ...baseData, amount: 500.5 };
    const result = createTwqrString(dataWithDecimal);
    const decoded = decodeURIComponent(result);
    
    // 500.5 * 100 = 50050
    expect(decoded).toContain('D1=50050');
  });

  test('應正確加入備註 (D9)', () => {
    const dataWithComment = { ...baseData, comment: 'Lunch' };
    const result = createTwqrString(dataWithComment);
    const decoded = decodeURIComponent(result);
    
    expect(decoded).toContain('D9=Lunch');
  });

  test('應正確處理銀行帳號補零 (不足 16 碼)', () => {
    const shortAccount = { ...baseData, accountNumber: '123' };
    const result = createTwqrString(shortAccount);
    const decoded = decodeURIComponent(result);
    
    // 123 -> 0000000000000123
    expect(decoded).toContain('D6=0000000000000123');
  });
  
  test('應正確回傳全字串編碼 (Encoded String)', () => {
    const result = createTwqrString(baseData);
    // 結果應該是編碼過的，不應包含原始的 '/' 或 ':'
    expect(result).not.toContain('://');
    expect(result).toContain('TWQRP%3A%2F%2F');
  });
});
