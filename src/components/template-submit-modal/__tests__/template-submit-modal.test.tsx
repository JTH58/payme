import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { TemplateSubmitModal } from '../index';

// ResizeObserver (Radix Dialog 需要)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// fetch mock
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const sampleFormState = {
  mode: 'pay' as const,
  title: '聚餐分帳',
  amount: '1000',
  pax: 4,
};

describe('TemplateSubmitModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    formState: sampleFormState,
  };

  // -----------------------------------------------------------------------
  // 渲染
  // -----------------------------------------------------------------------
  describe('渲染', () => {
    test('open=true → 顯示表單', () => {
      render(<TemplateSubmitModal {...defaultProps} />);
      expect(screen.getByText('投稿模板')).toBeInTheDocument();
      expect(screen.getByLabelText('投稿人名稱')).toBeInTheDocument();
    });

    test('open=false → 不顯示', () => {
      render(<TemplateSubmitModal {...defaultProps} open={false} />);
      expect(screen.queryByText('投稿模板')).not.toBeInTheDocument();
    });

    test('備註為選填', () => {
      render(<TemplateSubmitModal {...defaultProps} />);
      expect(screen.getByLabelText(/備註/)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // 表單驗證
  // -----------------------------------------------------------------------
  describe('表單驗證', () => {
    test('authorName 空 → 送出按鈕 disabled', () => {
      render(<TemplateSubmitModal {...defaultProps} />);
      const submitBtn = screen.getByRole('button', { name: /送出/i });
      expect(submitBtn).toBeDisabled();
    });

    test('authorName 有值 → 送出按鈕 enabled', () => {
      render(<TemplateSubmitModal {...defaultProps} />);
      const input = screen.getByLabelText('投稿人名稱');
      fireEvent.change(input, { target: { value: '小明' } });
      const submitBtn = screen.getByRole('button', { name: /送出/i });
      expect(submitBtn).not.toBeDisabled();
    });
  });

  // -----------------------------------------------------------------------
  // 成功送出
  // -----------------------------------------------------------------------
  describe('成功送出', () => {
    test('填寫完整 → POST 含 type="template" + formState', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const onOpenChange = jest.fn();
      render(
        <TemplateSubmitModal open={true} onOpenChange={onOpenChange} formState={sampleFormState} />,
      );

      const input = screen.getByLabelText('投稿人名稱');
      fireEvent.change(input, { target: { value: '小明' } });

      const submitBtn = screen.getByRole('button', { name: /送出/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, opts] = mockFetch.mock.calls[0];
        expect(url).toBe('/api/submit');
        const body = JSON.parse(opts.body);
        expect(body.type).toBe('template');
        expect(body.authorName).toBe('小明');
        expect(body.formState).toEqual(sampleFormState);
      });

      // 成功訊息
      await waitFor(() => {
        expect(screen.getByText(/感謝投稿/)).toBeInTheDocument();
      });

      // 自動關閉
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    test('含備註 → POST body 含 notes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<TemplateSubmitModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('投稿人名稱');
      fireEvent.change(nameInput, { target: { value: '小華' } });

      const notesInput = screen.getByLabelText(/備註/);
      fireEvent.change(notesInput, { target: { value: '很好用的模板' } });

      const submitBtn = screen.getByRole('button', { name: /送出/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.notes).toBe('很好用的模板');
      });
    });
  });

  // -----------------------------------------------------------------------
  // 錯誤處理
  // -----------------------------------------------------------------------
  describe('錯誤處理', () => {
    test('429 → 顯示限流提示', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: '請稍候再試' }),
      });

      render(<TemplateSubmitModal {...defaultProps} />);

      const input = screen.getByLabelText('投稿人名稱');
      fireEvent.change(input, { target: { value: '小明' } });

      const submitBtn = screen.getByRole('button', { name: /送出/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/稍候/)).toBeInTheDocument();
      });
    });

    test('fetch 失敗 → 顯示網路錯誤', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<TemplateSubmitModal {...defaultProps} />);

      const input = screen.getByLabelText('投稿人名稱');
      fireEvent.change(input, { target: { value: '小明' } });

      const submitBtn = screen.getByRole('button', { name: /送出/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/網路錯誤/)).toBeInTheDocument();
      });
    });
  });

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  describe('Loading state', () => {
    test('送出中 → 按鈕 disabled', async () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {}));

      render(<TemplateSubmitModal {...defaultProps} />);

      const input = screen.getByLabelText('投稿人名稱');
      fireEvent.change(input, { target: { value: '小明' } });

      const submitBtn = screen.getByRole('button', { name: /送出/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(screen.getByRole('button', { name: /送出中/i })).toBeDisabled();
    });
  });
});
