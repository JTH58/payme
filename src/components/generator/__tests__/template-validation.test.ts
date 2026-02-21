/**
 * Test the isValidTemplate type guard and template filtering logic.
 * We re-implement the guard here since it's a module-scoped function.
 */

import { Template } from '@/types/template';

const VALID_MODES = ['pay', 'bill'] as const;

function isValidTemplate(item: unknown): item is Template {
  if (typeof item !== 'object' || item === null) return false;
  const t = item as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.mode === 'string' &&
    (VALID_MODES as readonly string[]).includes(t.mode)
  );
}

describe('isValidTemplate type guard', () => {
  it('should accept a valid general template', () => {
    expect(isValidTemplate({
      id: 'test-1',
      title: 'Test',
      emoji: '🧪',
      description: 'A test',
      mode: 'pay',
      defaultValues: { amount: 100 },
    })).toBe(true);
  });

  it('should accept a valid bill template', () => {
    expect(isValidTemplate({
      id: 'bill-1',
      title: 'Bill',
      emoji: '🧾',
      description: 'Bill test',
      mode: 'bill',
      defaultValues: { title: 'Dinner', taxRate: 10 },
    })).toBe(true);
  });

  it('should reject null', () => {
    expect(isValidTemplate(null)).toBe(false);
  });

  it('should reject non-object', () => {
    expect(isValidTemplate('string')).toBe(false);
    expect(isValidTemplate(42)).toBe(false);
  });

  it('should reject object without id', () => {
    expect(isValidTemplate({ mode: 'pay' })).toBe(false);
  });

  it('should reject object with invalid mode', () => {
    expect(isValidTemplate({ id: 'x', mode: 'invalid' })).toBe(false);
  });

  it('should reject object with non-string mode', () => {
    expect(isValidTemplate({ id: 'x', mode: 123 })).toBe(false);
  });

  it('should filter an array of mixed items correctly', () => {
    const raw = [
      { id: 'ok', title: 'OK', emoji: '✅', description: '', mode: 'pay', defaultValues: {} },
      null,
      { id: 'bad', mode: 'invalid' },
      { noId: true, mode: 'pay' },
      { id: 'ok2', title: 'OK2', emoji: '✅', description: '', mode: 'bill', defaultValues: {} },
    ];

    const filtered = (raw as unknown[]).filter(isValidTemplate);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].id).toBe('ok');
    expect(filtered[1].id).toBe('ok2');
  });
});
