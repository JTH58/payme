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

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// Mock createShortLink
const mockCreateShortLink = jest.fn();
jest.mock('@/lib/shortener-api', () => ({
  createShortLink: (...args: unknown[]) => mockCreateShortLink(...args),
}));

// Mock safe-storage
const mockSafeGetItem = jest.fn();
const mockSafeSetItem = jest.fn();
jest.mock('@/lib/safe-storage', () => ({
  safeGetItem: (...args: unknown[]) => mockSafeGetItem(...args),
  safeSetItem: (...args: unknown[]) => mockSafeSetItem(...args),
}));

// Mock isCryptoAvailable
const mockIsCryptoAvailable = jest.fn().mockReturnValue(true);
jest.mock('@/lib/crypto', () => ({
  isCryptoAvailable: () => mockIsCryptoAvailable(),
}));

beforeEach(() => {
  mockCreateShortLink.mockReset();
  mockSafeGetItem.mockReset();
  mockSafeSetItem.mockReset();
  mockIsCryptoAvailable.mockReturnValue(true);
});

describe('ShareConfirmDialog', () => {
  const mockBuildEncryptedUrl = jest.fn();

  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    shareText: '銀行：822 中國信託\n帳號：123456789012\n金額：500 元',
    shareUrl: 'https://payme.tw/pay/test#/?data=0abc123',
    shortenerMode: 'simple' as const,
    buildEncryptedUrl: mockBuildEncryptedUrl,
    onConfirmShare: jest.fn(),
  };

  beforeEach(() => {
    mockBuildEncryptedUrl.mockReset();
  });

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
  });

  // ---------------------------------------------------------------------------
  // 情境幫助（目前暫時隱藏）
  // ---------------------------------------------------------------------------
  describe('情境幫助', () => {
    test('「如何使用？」幫助按鈕暫時隱藏', () => {
      render(<ShareConfirmDialog {...defaultProps} />);
      // 目前 TODO: 暫時隱藏，待 guide 內容完善後恢復
      expect(screen.queryByText('如何使用？')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 密碼保護 UI
  // ---------------------------------------------------------------------------
  describe('密碼保護 UI', () => {
    test('應顯示密碼 toggle 按鈕', () => {
      render(<ShareConfirmDialog {...defaultProps} />);
      expect(screen.getByText('設定密碼保護')).toBeInTheDocument();
    });

    test('點擊 toggle 後應顯示密碼輸入欄', async () => {
      render(<ShareConfirmDialog {...defaultProps} />);
      fireEvent.click(screen.getByText('設定密碼保護'));
      expect(screen.getByPlaceholderText('輸入分享密碼')).toBeInTheDocument();
    });

    test('密碼啟用但空白時確認按鈕應 disabled', () => {
      render(<ShareConfirmDialog {...defaultProps} />);
      fireEvent.click(screen.getByText('設定密碼保護'));
      const confirmBtn = screen.getByRole('button', { name: /確認分享/i });
      expect(confirmBtn).toBeDisabled();
    });

    test('密碼輸入後確認按鈕應啟用', async () => {
      const user = userEvent.setup();
      render(<ShareConfirmDialog {...defaultProps} />);
      fireEvent.click(screen.getByText('設定密碼保護'));
      await user.type(screen.getByPlaceholderText('輸入分享密碼'), 'secret123');
      const confirmBtn = screen.getByRole('button', { name: /確認分享/i });
      expect(confirmBtn).not.toBeDisabled();
    });

    test('crypto 不可用時 toggle 應 disabled', () => {
      mockIsCryptoAvailable.mockReturnValue(false);
      render(<ShareConfirmDialog {...defaultProps} />);
      const toggleBtn = screen.getByText('設定密碼保護').closest('button')!;
      expect(toggleBtn).toBeDisabled();
      expect(screen.getByText(/瀏覽器不支援加密/)).toBeInTheDocument();
    });

    test('沒有 buildEncryptedUrl 時 toggle 應 disabled', () => {
      render(<ShareConfirmDialog {...defaultProps} buildEncryptedUrl={undefined} />);
      const toggleBtn = screen.getByText('設定密碼保護').closest('button')!;
      expect(toggleBtn).toBeDisabled();
    });

    test('關閉 dialog 後再開啟密碼 state 應重置', async () => {
      const { rerender } = render(<ShareConfirmDialog {...defaultProps} />);

      // 啟用密碼
      fireEvent.click(screen.getByText('設定密碼保護'));
      expect(screen.getByPlaceholderText('輸入分享密碼')).toBeInTheDocument();

      // 關閉
      fireEvent.click(screen.getByRole('button', { name: /取消/i }));

      // 重新開啟
      rerender(<ShareConfirmDialog {...defaultProps} open={false} />);
      rerender(<ShareConfirmDialog {...defaultProps} open={true} />);

      // 密碼輸入欄不應存在
      expect(screen.queryByPlaceholderText('輸入分享密碼')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 密碼加密確認流程
  // ---------------------------------------------------------------------------
  describe('密碼加密確認流程', () => {
    test('密碼啟用 → 確認後應呼叫 buildEncryptedUrl 並回傳加密 URL', async () => {
      const user = userEvent.setup();
      mockBuildEncryptedUrl.mockResolvedValueOnce('https://payme.tw/pay/test#/?data=1encrypted');
      const onConfirmShare = jest.fn();
      render(<ShareConfirmDialog {...defaultProps} onConfirmShare={onConfirmShare} />);

      // 啟用密碼
      fireEvent.click(screen.getByText('設定密碼保護'));
      await user.type(screen.getByPlaceholderText('輸入分享密碼'), 'myPass');

      // 確認
      fireEvent.click(screen.getByRole('button', { name: /確認分享/i }));

      await waitFor(() => {
        expect(mockBuildEncryptedUrl).toHaveBeenCalledWith('myPass');
        expect(onConfirmShare).toHaveBeenCalledWith('https://payme.tw/pay/test#/?data=1encrypted', true);
      });
    });

    test('加密失敗時應顯示錯誤訊息及 fallback 按鈕', async () => {
      const user = userEvent.setup();
      mockBuildEncryptedUrl.mockRejectedValueOnce(new Error('加密失敗'));
      render(<ShareConfirmDialog {...defaultProps} />);

      fireEvent.click(screen.getByText('設定密碼保護'));
      await user.type(screen.getByPlaceholderText('輸入分享密碼'), 'myPass');
      fireEvent.click(screen.getByRole('button', { name: /確認分享/i }));

      await waitFor(() => {
        expect(screen.getByText('加密失敗')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /以未加密方式分享/i })).toBeInTheDocument();
      });
    });

    test('點擊「以未加密方式分享」應以原始 URL + passwordUsed=false 分享', async () => {
      const user = userEvent.setup();
      mockBuildEncryptedUrl.mockRejectedValueOnce(new Error('加密失敗'));
      const onConfirmShare = jest.fn();
      render(<ShareConfirmDialog {...defaultProps} onConfirmShare={onConfirmShare} />);

      fireEvent.click(screen.getByText('設定密碼保護'));
      await user.type(screen.getByPlaceholderText('輸入分享密碼'), 'myPass');
      fireEvent.click(screen.getByRole('button', { name: /確認分享/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /以未加密方式分享/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /以未加密方式分享/i }));

      await waitFor(() => {
        expect(onConfirmShare).toHaveBeenCalledWith(defaultProps.shareUrl, false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Checkbox 行為
  // ---------------------------------------------------------------------------
  describe('Checkbox 行為', () => {
    test('localStorage 無值時預設應未勾選', () => {
      mockSafeGetItem.mockReturnValue(null);
      render(<ShareConfirmDialog {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    test('localStorage 為 "true" 時預設應勾選', () => {
      mockSafeGetItem.mockReturnValue('true');
      render(<ShareConfirmDialog {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    test('勾選後應寫入 localStorage', () => {
      mockSafeGetItem.mockReturnValue(null);
      render(<ShareConfirmDialog {...defaultProps} />);
      fireEvent.click(screen.getByRole('checkbox'));
      expect(mockSafeSetItem).toHaveBeenCalledWith('payme_use_short_url', 'true');
    });

    test('取消勾選後應寫入 localStorage', () => {
      mockSafeGetItem.mockReturnValue('true');
      render(<ShareConfirmDialog {...defaultProps} />);
      fireEvent.click(screen.getByRole('checkbox'));
      expect(mockSafeSetItem).toHaveBeenCalledWith('payme_use_short_url', 'false');
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
        expect(onConfirmShare).toHaveBeenCalledWith(defaultProps.shareUrl, false);
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
        expect(onConfirmShare).toHaveBeenCalledWith('https://s.payme.tw/abc#Xy1z', false);
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
        expect(onConfirmShare).toHaveBeenCalledWith(defaultProps.shareUrl, false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Dialog 關閉 reset
  // ---------------------------------------------------------------------------
  describe('Dialog 關閉 reset', () => {
    test('關閉 Dialog 後重新開啟，error 應重置但 checkbox 保持', async () => {
      mockCreateShortLink.mockRejectedValueOnce(new Error('失敗'));
      const onOpenChange = jest.fn();
      const { rerender } = render(
        <ShareConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />
      );

      // 勾選 checkbox
      fireEvent.click(screen.getByRole('checkbox'));
      expect(screen.getByRole('checkbox')).toBeChecked();

      // 觸發 error
      fireEvent.click(screen.getByRole('button', { name: /確認分享/i }));
      await waitFor(() => {
        expect(screen.getByText(/失敗/)).toBeInTheDocument();
      });

      // 點擊取消
      fireEvent.click(screen.getByRole('button', { name: /取消/i }));
      expect(onOpenChange).toHaveBeenCalledWith(false);

      // 模擬 Dialog 關閉再重新開啟
      rerender(<ShareConfirmDialog {...defaultProps} onOpenChange={onOpenChange} open={false} />);
      rerender(<ShareConfirmDialog {...defaultProps} onOpenChange={onOpenChange} open={true} />);

      // Checkbox 應保持勾選（從 localStorage 讀取）
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();
      });

      // Error 應已重置
      expect(screen.queryByText(/失敗/)).not.toBeInTheDocument();
    });
  });
});
