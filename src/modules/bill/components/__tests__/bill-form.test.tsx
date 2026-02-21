import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { BillForm } from '../bill-form';
import { TwqrFormValues } from '@/modules/core/utils/validators';
import { BillData } from '@/types/bill';

// Mock safe-storage to prevent side effects
jest.mock('@/lib/safe-storage', () => ({
  safeGetItem: jest.fn(() => null),
  safeSetItem: jest.fn(),
}));

// Use fake timers to control setTimeout in BillForm (lines 75, 90)
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const stableOnChange = jest.fn();

function renderBillForm(opts?: { onBillDataChange?: (data: BillData) => void; initialData?: BillData }) {
  const onBillDataChange = opts?.onBillDataChange ?? stableOnChange;
  function Wrapper() {
    const form = useForm<TwqrFormValues>({
      defaultValues: { bankCode: '004', accountNumber: '12345678901234', amount: '', comment: '' },
    });
    return <BillForm form={form} onBillDataChange={onBillDataChange} initialData={opts?.initialData} />;
  }
  render(<Wrapper />);
  act(() => { jest.runAllTimers(); });
}

describe('BillForm Component', () => {
  beforeEach(() => stableOnChange.mockClear());

  test('應渲染基本 UI 元素', () => {
    renderBillForm();

    expect(screen.getByText(/分帳模式/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('例如：週五燒肉局')).toBeInTheDocument();
    expect(screen.getByText('+10%')).toBeInTheDocument();
    expect(screen.getByText(/分帳成員/)).toBeInTheDocument();
    expect(screen.getByText(/消費明細/)).toBeInTheDocument();
  });

  test('新增成員 → 成員列表更新', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderBillForm();

    const input = screen.getByPlaceholderText('輸入朋友名字...');
    await user.type(input, '小明');
    await user.keyboard('{Enter}');
    act(() => { jest.runAllTimers(); });

    expect(screen.getByText('小明')).toBeInTheDocument();
  });

  test('新增重複成員 → 顯示錯誤', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderBillForm();

    const input = screen.getByPlaceholderText('輸入朋友名字...');

    await user.type(input, '小明');
    await user.keyboard('{Enter}');
    act(() => { jest.runAllTimers(); });

    await user.type(input, '小明');
    await user.keyboard('{Enter}');
    // Only advance a small amount — the 3s clear timer must NOT fire yet
    act(() => { jest.advanceTimersByTime(100); });

    expect(screen.getByText('成員名稱不能重複')).toBeInTheDocument();
  });

  test('新增消費項目 → 項目列表更新', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderBillForm();

    const addButton = screen.getByRole('button', { name: /新增項目/ });
    await user.click(addButton);
    act(() => { jest.runAllTimers(); });

    const inputs = screen.getAllByPlaceholderText('項目名稱');
    expect(inputs.length).toBe(2);
  });

  test('勾選服務費 → onBillDataChange 回傳 s: true', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const handleChange = jest.fn();
    renderBillForm({ onBillDataChange: handleChange });

    const checkbox = screen.getByRole('checkbox', { name: /\+10%/ });
    await user.click(checkbox);
    act(() => { jest.runAllTimers(); });

    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
    expect(lastCall.s).toBe(true);
  });

  test('空成員名不可新增', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderBillForm();

    const input = screen.getByPlaceholderText('輸入朋友名字...');
    await user.clear(input);
    await user.keyboard('{Enter}');
    act(() => { jest.runAllTimers(); });

    expect(screen.getByText('分帳成員 (1人)')).toBeInTheDocument();
  });

  test('帶入 initialData 時正確渲染', () => {
    const initialData: BillData = {
      t: '生日派對',
      m: ['我', '小華', '小美'],
      i: [{ n: '蛋糕', p: 600, o: [0, 1, 2] }],
      s: true,
    };
    renderBillForm({ initialData });

    expect(screen.getByDisplayValue('生日派對')).toBeInTheDocument();
    expect(screen.getByText('小華')).toBeInTheDocument();
    expect(screen.getByText('小美')).toBeInTheDocument();
    expect(screen.getByText('分帳成員 (3人)')).toBeInTheDocument();
  });

  test('刪除項目 → 項目列表更新', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const initialData: BillData = {
      t: '',
      m: ['我'],
      i: [
        { n: '項目A', p: 100, o: [0] },
        { n: '項目B', p: 200, o: [0] },
      ],
      s: false,
    };
    renderBillForm({ initialData });

    expect(screen.getByDisplayValue('項目A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('項目B')).toBeInTheDocument();

    const trashButtons = screen.getAllByRole('button').filter(
      (btn) => btn.classList.contains('hover:text-red-400')
    );

    if (trashButtons.length > 0) {
      await user.click(trashButtons[0]);
      act(() => { jest.runAllTimers(); });

      const inputs = screen.getAllByPlaceholderText('項目名稱');
      expect(inputs.length).toBe(1);
    }
  });
});
