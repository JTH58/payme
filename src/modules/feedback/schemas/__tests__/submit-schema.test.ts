import {
  submitSchema,
  templateFormStateSchema,
  stripHtmlTags,
  stripSensitiveFields,
} from '../submit-schema';

// ---------------------------------------------------------------------------
// stripHtmlTags
// ---------------------------------------------------------------------------
describe('stripHtmlTags', () => {
  test('應移除所有 HTML 標籤', () => {
    expect(stripHtmlTags('<b>bold</b>')).toBe('bold');
    expect(stripHtmlTags('<script>alert("xss")</script>')).toBe('alert("xss")');
    expect(stripHtmlTags('<a href="x">link</a>')).toBe('link');
  });

  test('純文字不受影響', () => {
    expect(stripHtmlTags('hello world')).toBe('hello world');
  });

  test('空字串返回空字串', () => {
    expect(stripHtmlTags('')).toBe('');
  });

  test('巢狀標籤全部清除', () => {
    expect(stripHtmlTags('<div><p><span>text</span></p></div>')).toBe('text');
  });

  test('自閉合標籤也清除', () => {
    expect(stripHtmlTags('before<br/>after')).toBe('beforeafter');
    expect(stripHtmlTags('before<img src="x" />after')).toBe('beforeafter');
  });
});

// ---------------------------------------------------------------------------
// stripSensitiveFields
// ---------------------------------------------------------------------------
describe('stripSensitiveFields', () => {
  test('應移除 bankCode 和 accountNumber', () => {
    const state = {
      mode: 'pay' as const,
      title: '聚餐',
      amount: '500',
      bankCode: '004',
      accountNumber: '1234567890',
    };
    const result = stripSensitiveFields(state);
    expect(result).not.toHaveProperty('bankCode');
    expect(result).not.toHaveProperty('accountNumber');
    expect(result.mode).toBe('pay');
    expect(result.title).toBe('聚餐');
  });

  test('應移除 ac（多帳號陣列）', () => {
    const state = {
      mode: 'pay' as const,
      pax: 3,
      ac: [{ b: '004', a: '1234567890' }],
    };
    const result = stripSensitiveFields(state);
    expect(result).not.toHaveProperty('ac');
    expect(result.pax).toBe(3);
  });

  test('沒有敏感欄位時原樣返回（不含敏感 key）', () => {
    const state = {
      mode: 'bill' as const,
      title: '生日趴',
      items: [{ n: '蛋糕', p: 500, o: [0, 1] }],
    };
    const result = stripSensitiveFields(state);
    expect(result).toEqual(state);
  });
});

// ---------------------------------------------------------------------------
// submitSchema — feedback type
// ---------------------------------------------------------------------------
describe('submitSchema — feedback', () => {
  const validFeedback = {
    type: 'feedback' as const,
    category: 'bug' as const,
    description: '這個功能有問題，無法正常運作。',
  };

  test('合法 feedback 驗證通過', () => {
    const result = submitSchema.safeParse(validFeedback);
    expect(result.success).toBe(true);
  });

  test('含 optional contact 驗證通過', () => {
    const result = submitSchema.safeParse({
      ...validFeedback,
      contact: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });

  test('含 userAgent 驗證通過', () => {
    const result = submitSchema.safeParse({
      ...validFeedback,
      userAgent: 'Mozilla/5.0',
    });
    expect(result.success).toBe(true);
  });

  test('description 少於 10 字元 → 驗證失敗', () => {
    const result = submitSchema.safeParse({
      ...validFeedback,
      description: '太短了',
    });
    expect(result.success).toBe(false);
  });

  test('description 超過 1000 字元 → 驗證失敗', () => {
    const result = submitSchema.safeParse({
      ...validFeedback,
      description: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  test('contact 超過 100 字元 → 驗證失敗', () => {
    const result = submitSchema.safeParse({
      ...validFeedback,
      contact: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  test('category 必須是 bug/suggestion/other', () => {
    const result = submitSchema.safeParse({
      ...validFeedback,
      category: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  test('所有三種 category 都合法', () => {
    for (const category of ['bug', 'suggestion', 'other'] as const) {
      const result = submitSchema.safeParse({ ...validFeedback, category });
      expect(result.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// submitSchema — template type
// ---------------------------------------------------------------------------
describe('submitSchema — template', () => {
  const validTemplate = {
    type: 'template' as const,
    authorName: '小明',
    formState: {
      mode: 'pay' as const,
      title: '聚餐分帳',
      amount: '1000',
      pax: 4,
    },
  };

  test('合法 template 驗證通過', () => {
    const result = submitSchema.safeParse(validTemplate);
    expect(result.success).toBe(true);
  });

  test('含 optional notes 驗證通過', () => {
    const result = submitSchema.safeParse({
      ...validTemplate,
      notes: '這是一個很實用的模板',
    });
    expect(result.success).toBe(true);
  });

  test('authorName 空白 → 驗證失敗', () => {
    const result = submitSchema.safeParse({
      ...validTemplate,
      authorName: '',
    });
    expect(result.success).toBe(false);
  });

  test('authorName 超過 50 字元 → 驗證失敗', () => {
    const result = submitSchema.safeParse({
      ...validTemplate,
      authorName: 'a'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  test('notes 超過 500 字元 → 驗證失敗', () => {
    const result = submitSchema.safeParse({
      ...validTemplate,
      notes: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  test('formState 含 bankCode → strict() 拒絕', () => {
    const result = submitSchema.safeParse({
      ...validTemplate,
      formState: {
        ...validTemplate.formState,
        bankCode: '004',
      },
    });
    expect(result.success).toBe(false);
  });

  test('formState 含 accountNumber → strict() 拒絕', () => {
    const result = submitSchema.safeParse({
      ...validTemplate,
      formState: {
        ...validTemplate.formState,
        accountNumber: '1234567890',
      },
    });
    expect(result.success).toBe(false);
  });

  test('formState 含 ac → strict() 拒絕', () => {
    const result = submitSchema.safeParse({
      ...validTemplate,
      formState: {
        ...validTemplate.formState,
        ac: [{ b: '004', a: '1234567890' }],
      },
    });
    expect(result.success).toBe(false);
  });

  test('formState.mode 必須是 payment/bill', () => {
    const result = submitSchema.safeParse({
      ...validTemplate,
      formState: { ...validTemplate.formState, mode: 'invalid' },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// templateFormStateSchema — standalone
// ---------------------------------------------------------------------------
describe('templateFormStateSchema', () => {
  test('payment 模式', () => {
    const result = templateFormStateSchema.safeParse({
      mode: 'pay',
      amount: '500',
    });
    expect(result.success).toBe(true);
  });

  test('bill 模式含 items + members', () => {
    const result = templateFormStateSchema.safeParse({
      mode: 'bill',
      title: '聚餐',
      items: [{ n: '披薩', p: 300, o: [0, 1] }],
      members: ['Alice', 'Bob'],
      taxRate: 10,
    });
    expect(result.success).toBe(true);
  });

  test('payment 模式含 pax', () => {
    const result = templateFormStateSchema.safeParse({
      mode: 'pay',
      title: '均分',
      pax: 3,
      amount: '900',
    });
    expect(result.success).toBe(true);
  });
});
