import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackModal } from '../index';

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

describe('FeedbackModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
  };

  // -----------------------------------------------------------------------
  // 渲染
  // -----------------------------------------------------------------------
  describe('渲染', () => {
    test('open=true → 顯示表單', () => {
      render(<FeedbackModal {...defaultProps} />);
      expect(screen.getByText('意見回饋')).toBeInTheDocument();
      expect(screen.getByLabelText('類別')).toBeInTheDocument();
      expect(screen.getByLabelText('描述')).toBeInTheDocument();
    });

    test('open=false → 不顯示', () => {
      render(<FeedbackModal {...defaultProps} open={false} />);
      expect(screen.queryByText('意見回饋')).not.toBeInTheDocument();
    });

    test('聯絡方式為選填', () => {
      render(<FeedbackModal {...defaultProps} />);
      expect(screen.getByLabelText(/聯絡方式/)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // 表單驗證
  // -----------------------------------------------------------------------
  describe('表單驗證', () => {
    test('description 為空 → 送出按鈕 disabled', () => {
      render(<FeedbackModal {...defaultProps} />);
      const submitBtn = screen.getByRole('button', { name: /送出/i });
      expect(submitBtn).toBeDisabled();
    });

    test('description 少於 10 字 → 送出按鈕 disabled', () => {
      render(<FeedbackModal {...defaultProps} />);
      const textarea = screen.getByLabelText('描述');
      fireEvent.change(textarea, { target: { value: '太短' } });
      const submitBtn = screen.getByRole('button', { name: /送出/i });
      expect(submitBtn).toBeDisabled();
    });

    test('description >= 10 字 → 送出按鈕 enabled', () => {
      render(<FeedbackModal {...defaultProps} />);
      const textarea = screen.getByLabelText('描述');
      fireEvent.change(textarea, { target: { value: '這個功能有問題，需要修正一下。' } });
      const submitBtn = screen.getByRole('button', { name: /送出/i });
      expect(submitBtn).not.toBeDisabled();
    });
  });

  // -----------------------------------------------------------------------
  // 成功送出
  // -----------------------------------------------------------------------
  describe('成功送出', () => {
    test('填寫完整 → POST /api/submit + 顯示成功 + 自動關閉', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const onOpenChange = jest.fn();
      render(<FeedbackModal open={true} onOpenChange={onOpenChange} />);

      // Fill the form
      const textarea = screen.getByLabelText('描述');
      fireEvent.change(textarea, { target: { value: '這個功能有問題，需要修正一下。' } });

      // Submit
      const submitBtn = screen.getByRole('button', { name: /送出/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Verify fetch was called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, opts] = mockFetch.mock.calls[0];
        expect(url).toBe('/api/submit');
        const body = JSON.parse(opts.body);
        expect(body.type).toBe('feedback');
        expect(body.category).toBe('bug'); // default
      });

      // Success message
      await waitFor(() => {
        expect(screen.getByText(/感謝/)).toBeInTheDocument();
      });

      // Auto-close after 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    test('選擇不同 category 送出', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<FeedbackModal {...defaultProps} />);

      // Change category
      const select = screen.getByLabelText('類別');
      fireEvent.change(select, { target: { value: 'suggestion' } });

      // Fill description
      const textarea = screen.getByLabelText('描述');
      fireEvent.change(textarea, { target: { value: '希望可以加入暗色模式的選項功能。' } });

      // Submit
      const submitBtn = screen.getByRole('button', { name: /送出/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.category).toBe('suggestion');
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
        json: async () => ({ error: '請稍候再試', retryAfter: 600 }),
      });

      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByLabelText('描述');
      fireEvent.change(textarea, { target: { value: '這個功能有問題，需要修正一下。' } });

      const submitBtn = screen.getByRole('button', { name: /送出/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/稍候/)).toBeInTheDocument();
      });
    });

    test('400 → 顯示驗證錯誤', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: '驗證失敗' }),
      });

      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByLabelText('描述');
      fireEvent.change(textarea, { target: { value: '這個功能有問題，需要修正一下。' } });

      const submitBtn = screen.getByRole('button', { name: /送出/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/驗證失敗/)).toBeInTheDocument();
      });
    });

    test('fetch 失敗 → 顯示網路錯誤 + 表單保留', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByLabelText('描述');
      fireEvent.change(textarea, { target: { value: '這個功能有問題，需要修正一下。' } });

      const submitBtn = screen.getByRole('button', { name: /送出/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/網路錯誤/)).toBeInTheDocument();
      });

      // 表單保留
      expect(textarea).toHaveValue('這個功能有問題，需要修正一下。');
    });

    test('502 → 顯示轉發失敗', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ error: '轉發失敗' }),
      });

      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByLabelText('描述');
      fireEvent.change(textarea, { target: { value: '這個功能有問題，需要修正一下。' } });

      const submitBtn = screen.getByRole('button', { name: /送出/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/轉發失敗/)).toBeInTheDocument();
      });
    });
  });

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  describe('Loading state', () => {
    test('送出中 → 按鈕顯示 loading + disabled', async () => {
      // Never-resolving promise to keep loading state
      mockFetch.mockReturnValueOnce(new Promise(() => {}));

      render(<FeedbackModal {...defaultProps} />);

      const textarea = screen.getByLabelText('描述');
      fireEvent.change(textarea, { target: { value: '這個功能有問題，需要修正一下。' } });

      const submitBtn = screen.getByRole('button', { name: /送出/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(screen.getByRole('button', { name: /送出中/i })).toBeDisabled();
    });
  });
});
