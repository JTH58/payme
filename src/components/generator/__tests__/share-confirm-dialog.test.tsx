import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareConfirmDialog } from '../share-confirm-dialog';

// ResizeObserver (Radix Dialog 需要)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock createShortLink
const mockCreateShortLink = jest.fn();
jest.mock('@/lib/shortener-api', () => ({
  createShortLink: (...args: unknown[]) => mockCreateShortLink(...args),
}));

beforeEach(() => {
  mockCreateShortLink.mockReset();
});

describe('ShareConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    shareText: '銀行：822 中國信託\n帳號：123456789012\n金額：500 元',
    shareUrl: 'https://payme.tw/pay/test#/?data=0abc123',
    passwordHint: '',
    shortenerMode: 'simple' as const,
    onConfirmShare: jest.fn(),
  };

  // ---------------------------------------------------------------------------
  // Dialog 渲染
  // ---------------------------------------------------------------------------
  describe('Dialog 渲染', () => {
    test('open=true 時應渲染 Dialog 內容', () => {
      render(<ShareConfirmDialog {...defaultProps} />);
      expect(screen.getByText('分享確認')).toBeInTheDocument();
    });

    test('open=false 時不應渲染 Dialog 內容', () => {
      render(<ShareConfirmDialog {...defaultProps} open={false} />);
      expect(screen.queryByText('分享確認')).not.toBeInTheDocument();
    });

    test('應顯示分享文字預覽', () => {
      render(<ShareConfirmDialog {...defaultProps} />);
      expect(screen.getByText(/822 中國信託/)).toBeInTheDocument();
      expect(screen.getByText(/500 元/)).toBeInTheDocument();
    });

    test('應顯示完整 URL', () => {
      render(<ShareConfirmDialog {...defaultProps} />);
      expect(screen.getByText(defaultProps.shareUrl)).toBeInTheDocument();
    });

    test('有密碼提示時應顯示', () => {
      render(<ShareConfirmDialog {...defaultProps} passwordHint="🔒 此連結需要密碼才能查看" />);
      expect(screen.getByText(/密碼才能查看/)).toBeInTheDocument();
    });

    test('無密碼提示時不應顯示', () => {
      render(<ShareConfirmDialog {...defaultProps} />);
      expect(screen.queryByText(/密碼/)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Checkbox 行為
  // ---------------------------------------------------------------------------
  describe('Checkbox 行為', () => {
    test('預設應未勾選', () => {
      render(<ShareConfirmDialog {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    test('勾選後應顯示說明文字', async () => {
      render(<ShareConfirmDialog {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(screen.getByText(/連結將加密為短網址/)).toBeInTheDocument();
        expect(screen.getByText(/12 小時後自動銷毀/)).toBeInTheDocument();
        expect(screen.getByText(/AES-256-GCM/)).toBeInTheDocument();
        expect(screen.getByText(/伺服器本身都解不開/)).toBeInTheDocument();
        expect(screen.getByText(/了解更多/)).toBeInTheDocument();
      });
    });

    test('未勾選時不應顯示說明文字', () => {
      render(<ShareConfirmDialog {...defaultProps} />);
      expect(screen.queryByText(/連結將加密為短網址/)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 確認分享（不勾選短網址）
  // ---------------------------------------------------------------------------
  describe('確認分享（完整網址）', () => {
    test('不勾選 → 確認後應直接回傳原始 URL', async () => {
      const onConfirmShare = jest.fn();
      render(<ShareConfirmDialog {...defaultProps} onConfirmShare={onConfirmShare} />);

      const confirmBtn = screen.getByRole('button', { name: /確認分享/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(onConfirmShare).toHaveBeenCalledWith(defaultProps.shareUrl);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 確認分享（勾選短網址）
  // ---------------------------------------------------------------------------
  describe('確認分享（短網址）', () => {
    test('勾選 → 確認後應呼叫 createShortLink 並回傳短連結', async () => {
      mockCreateShortLink.mockResolvedValueOnce('https://s.payme.tw/abc#Xy1z');
      const onConfirmShare = jest.fn();
      render(<ShareConfirmDialog {...defaultProps} onConfirmShare={onConfirmShare} />);

      // 勾選 checkbox
      fireEvent.click(screen.getByRole('checkbox'));

      // 確認分享
      const confirmBtn = screen.getByRole('button', { name: /確認分享/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockCreateShortLink).toHaveBeenCalledWith(defaultProps.shareUrl, 'simple');
        expect(onConfirmShare).toHaveBeenCalledWith('https://s.payme.tw/abc#Xy1z');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Loading 狀態
  // ---------------------------------------------------------------------------
  describe('Loading 狀態', () => {
    test('建立短連結時確認按鈕應顯示 loading 且 disabled', async () => {
      // 使用延遲 promise 模擬載入中
      let resolvePromise: (value: string) => void;
      mockCreateShortLink.mockReturnValueOnce(
        new Promise<string>((resolve) => { resolvePromise = resolve; })
      );

      render(<ShareConfirmDialog {...defaultProps} />);
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /確認分享/i }));

      // 應顯示 loading 狀態
      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /確認分享/i });
        expect(btn).toBeDisabled();
      });

      // Cleanup: resolve the promise
      resolvePromise!('https://s.payme.tw/abc#Xy1z');
    });
  });

  // ---------------------------------------------------------------------------
  // Error 處理
  // ---------------------------------------------------------------------------
  describe('Error 處理', () => {
    test('createShortLink 失敗時應顯示錯誤訊息', async () => {
      mockCreateShortLink.mockRejectedValueOnce(new Error('請求過於頻繁，請稍後再試'));
      render(<ShareConfirmDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /確認分享/i }));

      await waitFor(() => {
        expect(screen.getByText(/請求過於頻繁/)).toBeInTheDocument();
      });
    });

    test('錯誤時應顯示「使用完整網址分享」fallback 按鈕', async () => {
      mockCreateShortLink.mockRejectedValueOnce(new Error('網路連線失敗'));
      render(<ShareConfirmDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /確認分享/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /使用完整網址分享/i })).toBeInTheDocument();
      });
    });

    test('點擊 fallback 按鈕應以原始 URL 分享', async () => {
      mockCreateShortLink.mockRejectedValueOnce(new Error('失敗'));
      const onConfirmShare = jest.fn();
      render(<ShareConfirmDialog {...defaultProps} onConfirmShare={onConfirmShare} />);

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /確認分享/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /使用完整網址分享/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /使用完整網址分享/i }));

      await waitFor(() => {
        expect(onConfirmShare).toHaveBeenCalledWith(defaultProps.shareUrl);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Dialog 關閉 reset
  // ---------------------------------------------------------------------------
  describe('Dialog 關閉 reset', () => {
    test('關閉 Dialog 後重新開啟，狀態應重置', async () => {
      const onOpenChange = jest.fn();
      const { rerender } = render(
        <ShareConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />
      );

      // 勾選 checkbox
      fireEvent.click(screen.getByRole('checkbox'));
      expect(screen.getByRole('checkbox')).toBeChecked();

      // 點擊取消
      fireEvent.click(screen.getByRole('button', { name: /取消/i }));
      expect(onOpenChange).toHaveBeenCalledWith(false);

      // 模擬 Dialog 關閉再重新開啟
      rerender(<ShareConfirmDialog {...defaultProps} onOpenChange={onOpenChange} open={false} />);
      rerender(<ShareConfirmDialog {...defaultProps} onOpenChange={onOpenChange} open={true} />);

      // Checkbox 應恢復未勾選
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();
      });
    });
  });
});
