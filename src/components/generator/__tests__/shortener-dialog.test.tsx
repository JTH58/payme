import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShortenerDialog } from '../shortener-dialog';

// ResizeObserver (Radix Dialog 需要)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Clipboard API mock — 在 beforeEach 中重新設定
const writeTextMock = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeTextMock.mockClear();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    writable: true,
    configurable: true,
  });
});

describe('ShortenerDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    shareUrl: 'https://payme.tw/pay/test#/?data=0abc123',
  };

  // ---------------------------------------------------------------------------
  // Cycle 4 — Dialog 渲染
  // ---------------------------------------------------------------------------
  describe('Dialog 渲染', () => {
    test('open=true 時應渲染 Dialog 內容', () => {
      render(<ShortenerDialog {...defaultProps} />);
      expect(screen.getByText('縮網址服務')).toBeInTheDocument();
    });

    test('open=false 時不應渲染 Dialog 內容', () => {
      render(<ShortenerDialog {...defaultProps} open={false} />);
      expect(screen.queryByText('縮網址服務')).not.toBeInTheDocument();
    });

    test('應顯示完整的分享網址', () => {
      render(<ShortenerDialog {...defaultProps} />);
      expect(screen.getByText(defaultProps.shareUrl)).toBeInTheDocument();
    });

    test('應顯示三個縮網址服務連結', () => {
      render(<ShortenerDialog {...defaultProps} />);
      const links = screen.getAllByRole('link');
      const shortenerLinks = links.filter(
        (link) => link.getAttribute('href')?.includes('reurl') ||
                  link.getAttribute('href')?.includes('myppt') ||
                  link.getAttribute('href')?.includes('ppt.cc')
      );
      expect(shortenerLinks).toHaveLength(3);
    });

    test('所有連結應在新分頁開啟', () => {
      render(<ShortenerDialog {...defaultProps} />);
      const links = screen.getAllByRole('link');
      const shortenerLinks = links.filter(
        (link) => link.getAttribute('href')?.includes('reurl') ||
                  link.getAttribute('href')?.includes('myppt') ||
                  link.getAttribute('href')?.includes('ppt.cc')
      );
      shortenerLinks.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link.getAttribute('rel')).toContain('noopener');
      });
    });

    test('應顯示隱私提示文字', () => {
      render(<ShortenerDialog {...defaultProps} />);
      expect(screen.getByText(/第三方/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Cycle 5 — 複製功能
  // ---------------------------------------------------------------------------
  describe('複製功能', () => {
    test('點擊複製按鈕應複製 URL 到剪貼簿', async () => {
      render(<ShortenerDialog {...defaultProps} />);

      const copyBtn = screen.getByRole('button', { name: /複製/i });
      await act(async () => {
        fireEvent.click(copyBtn);
      });

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith(defaultProps.shareUrl);
      });
    });

    test('複製成功後按鈕文字應暫時變更為「已複製」', async () => {
      jest.useFakeTimers();
      render(<ShortenerDialog {...defaultProps} />);

      const copyBtn = screen.getByRole('button', { name: /複製/i });
      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(screen.getByText(/已複製/)).toBeInTheDocument();

      // 2秒後恢復
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.queryByText(/已複製/)).not.toBeInTheDocument();
      jest.useRealTimers();
    });
  });

  // ---------------------------------------------------------------------------
  // Cycle 6 — 邊界案例
  // ---------------------------------------------------------------------------
  describe('邊界案例', () => {
    test('超長 URL (950+ 字元) 應正確顯示且可複製', async () => {
      const longUrl = 'https://payme.tw/pay/test#/?data=0' + 'a'.repeat(950);
      render(<ShortenerDialog {...defaultProps} shareUrl={longUrl} />);

      // URL 應顯示
      expect(screen.getByText(longUrl)).toBeInTheDocument();

      // 複製應收到完整 URL
      const copyBtn = screen.getByRole('button', { name: /複製/i });
      await act(async () => {
        fireEvent.click(copyBtn);
      });
      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith(longUrl);
      });
    });

    test('shareUrl 為空字串時複製按鈕應禁用', () => {
      render(<ShortenerDialog {...defaultProps} shareUrl="" />);
      const copyBtn = screen.getByRole('button', { name: /複製/i });
      expect(copyBtn).toBeDisabled();
    });

    test('關閉 Dialog 應呼叫 onOpenChange(false)', async () => {
      const onOpenChange = jest.fn();
      render(<ShortenerDialog {...defaultProps} onOpenChange={onOpenChange} />);

      // Click the close button (X) using fireEvent to avoid timeout
      const closeBtn = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });
});
