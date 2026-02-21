import { twqrFormSchema } from './validators';

describe('TWQR Validator Schema', () => {
  
  describe('Bank Code (銀行代碼)', () => {
    test('應接受有效的 3 碼銀行代碼', () => {
      const result = twqrFormSchema.pick({ bankCode: true }).safeParse({ bankCode: '822' });
      expect(result.success).toBe(true);
    });

    test('應拒絕非 3 碼的代碼', () => {
      expect(twqrFormSchema.pick({ bankCode: true }).safeParse({ bankCode: '12' }).success).toBe(false);
      expect(twqrFormSchema.pick({ bankCode: true }).safeParse({ bankCode: '1234' }).success).toBe(false);
    });

    test('應拒絕非數字的代碼', () => {
      expect(twqrFormSchema.pick({ bankCode: true }).safeParse({ bankCode: 'ABC' }).success).toBe(false);
    });
  });

  describe('Account Number (銀行帳號)', () => {
    test('應接受 10~16 碼的帳號', () => {
      expect(twqrFormSchema.pick({ accountNumber: true }).safeParse({ accountNumber: '1234567890' }).success).toBe(true);
      expect(twqrFormSchema.pick({ accountNumber: true }).safeParse({ accountNumber: '1234567890123456' }).success).toBe(true);
    });

    test('應拒絕太短或太長的帳號', () => {
      expect(twqrFormSchema.pick({ accountNumber: true }).safeParse({ accountNumber: '123' }).success).toBe(false);
      expect(twqrFormSchema.pick({ accountNumber: true }).safeParse({ accountNumber: '12345678901234567' }).success).toBe(false);
    });

    test('應拒絕含非數字字符的帳號', () => {
      expect(twqrFormSchema.pick({ accountNumber: true }).safeParse({ accountNumber: '12345abcde' }).success).toBe(false);
    });
  });

  describe('Amount (金額)', () => {
    test('應接受合法的正整數', () => {
      expect(twqrFormSchema.pick({ amount: true }).safeParse({ amount: '100' }).success).toBe(true);
      expect(twqrFormSchema.pick({ amount: true }).safeParse({ amount: '10000000' }).success).toBe(true);
    });

    test('可以不填 (Optional)', () => {
      expect(twqrFormSchema.pick({ amount: true }).safeParse({ amount: '' }).success).toBe(true);
      expect(twqrFormSchema.pick({ amount: true }).safeParse({}).success).toBe(true);
    });

    test('應拒絕負數或 0', () => {
      expect(twqrFormSchema.pick({ amount: true }).safeParse({ amount: '0' }).success).toBe(false);
      expect(twqrFormSchema.pick({ amount: true }).safeParse({ amount: '-10' }).success).toBe(false);
    });

    test('應拒絕小數', () => {
      expect(twqrFormSchema.pick({ amount: true }).safeParse({ amount: '10.5' }).success).toBe(false);
    });

    test('應拒絕非數字字串', () => {
      expect(twqrFormSchema.pick({ amount: true }).safeParse({ amount: 'abc' }).success).toBe(false);
    });
  });

  describe('Comment (備註)', () => {
    test('應接受 20 字以內的備註', () => {
      expect(twqrFormSchema.pick({ comment: true }).safeParse({ comment: '測試備註' }).success).toBe(true);
    });
    
    test('應拒絕超過 20 字的備註', () => {
      const longComment = '這是一段非常非常長長長長長長長長長長長長長長長長長長長長長長長長長長長的備註';
      expect(twqrFormSchema.pick({ comment: true }).safeParse({ comment: longComment }).success).toBe(false);
    });
  });
});
