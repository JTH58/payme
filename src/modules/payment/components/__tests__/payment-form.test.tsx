import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PaymentForm } from '../payment-form';
import { twqrFormSchema, TwqrFormValues } from '@/modules/core/utils/validators';

// Mock safe-storage to prevent side effects
jest.mock('@/lib/safe-storage', () => ({
  safeGetItem: jest.fn(() => null),
  safeSetItem: jest.fn(),
}));

// Use fake timers to control effect cascades
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function renderPaymentForm() {
  let formRef: ReturnType<typeof useForm<TwqrFormValues>> | null = null;

  function Wrapper() {
    const form = useForm<TwqrFormValues>({
      resolver: zodResolver(twqrFormSchema),
      defaultValues: { bankCode: '004', accountNumber: '12345678901234', amount: '', comment: '' },
      mode: 'onChange',
    });
    formRef = form;
    const reset = () => form.reset({ bankCode: '', accountNumber: '', amount: '', comment: '' });

    return <PaymentForm form={form} reset={reset} />;
  }

  render(<Wrapper />);
  // Flush all pending timers + effects
  act(() => { jest.runAllTimers(); });

  return { formRef: formRef! };
}

describe('PaymentForm Component', () => {
  test('應渲染直接輸入金額模式（預設）', () => {
    renderPaymentForm();

    expect(screen.getByText(/收款資訊/)).toBeInTheDocument();
    expect(screen.getByLabelText(/轉帳金額/)).toBeInTheDocument();
    expect(screen.getByLabelText(/轉帳備註/)).toBeInTheDocument();
    expect(screen.getByText(/均分計算/)).toBeInTheDocument();
  });

  test('切換 Toggle → 顯示均分計算器', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderPaymentForm();

    const toggle = screen.getByText('均分計算').closest('button')!;
    await user.click(toggle);
    act(() => { jest.runAllTimers(); });

    expect(screen.getByLabelText('消費總金額')).toBeInTheDocument();
    expect(screen.getByText('分攤人數')).toBeInTheDocument();
    expect(screen.getByText(/每人應付/)).toBeInTheDocument();
  });

  test('直接輸入模式可輸入金額與備註', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderPaymentForm();

    const amountInput = screen.getByLabelText(/轉帳金額/) as HTMLInputElement;
    await user.type(amountInput, '500');
    act(() => { jest.runAllTimers(); });

    expect(amountInput.value).toBe('500');

    const commentInput = screen.getByLabelText(/轉帳備註/) as HTMLInputElement;
    await user.type(commentInput, '午餐');
    act(() => { jest.runAllTimers(); });

    expect(commentInput.value).toBe('午餐');
  });

  test('重置按鈕清空表單', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderPaymentForm();

    const amountInput = screen.getByLabelText(/轉帳金額/) as HTMLInputElement;
    await user.type(amountInput, '999');
    act(() => { jest.runAllTimers(); });
    expect(amountInput.value).toBe('999');

    const resetButton = screen.getByRole('button', { name: /清空所有欄位/ });
    await user.click(resetButton);
    act(() => { jest.runAllTimers(); });

    expect(amountInput.value).toBe('');
  });

  test('均分模式顯示人數計數器預設 2 人', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderPaymentForm();

    const toggle = screen.getByText('均分計算').closest('button')!;
    await user.click(toggle);
    act(() => { jest.runAllTimers(); });

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('人')).toBeInTheDocument();
  });

  test('服務費 checkbox 存在於均分模式', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderPaymentForm();

    const toggle = screen.getByText('均分計算').closest('button')!;
    await user.click(toggle);
    act(() => { jest.runAllTimers(); });

    expect(screen.getByRole('checkbox', { name: /加收 10% 服務費/ })).toBeInTheDocument();
  });
});
