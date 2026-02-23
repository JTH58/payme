import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { BillForm } from '../bill-form';
import { TwqrFormValues } from '@/modules/core/utils/validators';
import { BillData } from '@/types/bill';

// ResizeObserver (Radix Dialog 需要)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

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

  // === Auto-select (dirtyItemsRef) tests ===

  test('初始空項目在新增成員後自動全選', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const handleChange = jest.fn();
    renderBillForm({ onBillDataChange: handleChange });

    // 初始：1 位成員 "我"，空項目 o: []
    // 新增成員 → 空項目 (non-dirty) 應自動全選
    const input = screen.getByPlaceholderText('輸入朋友名字...');
    await user.type(input, '小明');
    await user.keyboard('{Enter}');
    act(() => { jest.runAllTimers(); });

    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as BillData;
    expect(lastCall.i[0].o).toEqual([0, 1]); // 自動全選 "我" + "小明"
  });

  test('手動 toggle 後變 dirty → 新增成員不再自動加入', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const handleChange = jest.fn();
    renderBillForm({ onBillDataChange: handleChange });

    // 先新增成員讓項目自動全選
    const input = screen.getByPlaceholderText('輸入朋友名字...');
    await user.type(input, '小明');
    await user.keyboard('{Enter}');
    act(() => { jest.runAllTimers(); });

    // 點擊 inline chip toggle 取消 "小明" (index 1) → 變成 dirty
    const chipButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent === '小明✓'
    );
    await user.click(chipButtons[0]);
    act(() => { jest.runAllTimers(); });

    // 再新增第三位成員
    await user.type(input, '小華');
    await user.keyboard('{Enter}');
    act(() => { jest.runAllTimers(); });

    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as BillData;
    // dirty 項目不會自動加入新成員，應仍然只有 [0]（toggle 掉了 1）
    expect(lastCall.i[0].o).not.toContain(2);
  });

  test('initialData 項目視為 dirty → 新增成員不影響', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const handleChange = jest.fn();
    const initialData: BillData = {
      t: '',
      m: ['我', '小華'],
      i: [{ n: '蛋糕', p: 300, o: [0] }], // Host 刻意只選了自己
      s: false,
    };
    renderBillForm({ onBillDataChange: handleChange, initialData });

    // 新增成員
    const input = screen.getByPlaceholderText('輸入朋友名字...');
    await user.type(input, '小美');
    await user.keyboard('{Enter}');
    act(() => { jest.runAllTimers(); });

    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as BillData;
    // initialData 項目是 dirty，不應自動加入新成員
    expect(lastCall.i[0].o).toEqual([0]);
  });

  test('刪除項目後 dirty 索引正確移位', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const handleChange = jest.fn();
    const initialData: BillData = {
      t: '',
      m: ['我', '小華'],
      i: [
        { n: '項目A', p: 100, o: [0] },    // dirty (initialData idx 0)
        { n: '項目B', p: 200, o: [0, 1] }, // dirty (initialData idx 1)
      ],
      s: false,
    };
    renderBillForm({ onBillDataChange: handleChange, initialData });

    // 刪除項目A (index 0) → 項目B 變成 index 0，dirty 應移位
    // 用 hover:bg-white/5 區分項目刪除按鈕 vs 成員刪除按鈕
    const trashButtons = screen.getAllByRole('button').filter(
      (btn) => btn.classList.contains('hover:text-red-400') && btn.classList.contains('hover:bg-white/5')
    );
    await user.click(trashButtons[0]);
    act(() => { jest.runAllTimers(); });

    // 新增成員 → 原項目B (現在 index 0) 仍然是 dirty，不會自動全選
    const input = screen.getByPlaceholderText('輸入朋友名字...');
    await user.type(input, '小美');
    await user.keyboard('{Enter}');
    act(() => { jest.runAllTimers(); });

    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as BillData;
    expect(lastCall.i[0].o).toEqual([0, 1]); // 保持原值，不自動加新成員
  });

  test('成員移除時 o 索引正確調整', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const handleChange = jest.fn();
    const initialData: BillData = {
      t: '',
      m: ['我', '小華', '小美'],
      i: [{ n: '披薩', p: 500, o: [0, 1, 2] }],
      s: false,
    };
    renderBillForm({ onBillDataChange: handleChange, initialData });

    // 刪除成員 "小華" (index 1)
    const badges = screen.getAllByText('小華');
    const badge = badges[0].closest('.flex.items-center');
    const removeBtn = badge?.querySelector('button');
    await user.click(removeBtn!);
    act(() => { jest.runAllTimers(); });

    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as BillData;
    // o 應從 [0, 1, 2] → 移除 1 → [0, 2] → 重新映射 → [0, 1]
    expect(lastCall.i[0].o).toEqual([0, 1]);
    expect(lastCall.m).toEqual(['我', '小美']);
  });

  test('應渲染「如何使用？」幫助按鈕', () => {
    renderBillForm();
    expect(screen.getByText('如何使用？')).toBeInTheDocument();
  });

  test('點擊「如何使用？」後 HelpDialog 顯示「分帳收款」', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderBillForm();

    await user.click(screen.getByText('如何使用？'));
    act(() => { jest.runAllTimers(); });

    expect(screen.getByText('分帳收款')).toBeInTheDocument();
  });

  test('全選按鈕標記 dirty', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const handleChange = jest.fn();
    renderBillForm({ onBillDataChange: handleChange });

    // 先新增成員讓項目自動全選
    const input = screen.getByPlaceholderText('輸入朋友名字...');
    await user.type(input, '小明');
    await user.keyboard('{Enter}');
    act(() => { jest.runAllTimers(); });

    // 先 toggle 取消一位，讓「全選」按鈕出現
    const chipBtn = screen.getAllByRole('button').find(
      (btn) => btn.textContent === '小明✓'
    );
    await user.click(chipBtn!);
    act(() => { jest.runAllTimers(); });

    // 點擊 inline「全選」按鈕
    const selectAllBtn = screen.getByText('全選');
    await user.click(selectAllBtn);
    act(() => { jest.runAllTimers(); });

    // 再新增第三位成員 → 因為已 dirty，不應自動加入
    await user.type(input, '小華');
    await user.keyboard('{Enter}');
    act(() => { jest.runAllTimers(); });

    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as BillData;
    // dirty 項目不會自動加入新成員 index 2
    expect(lastCall.i[0].o).not.toContain(2);
  });
});
