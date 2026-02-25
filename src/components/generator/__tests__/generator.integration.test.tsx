import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Generator } from '../index';
import userEvent from '@testing-library/user-event';

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

// 1. Mock Next.js Navigation
const mockSearchParams = new URLSearchParams();
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
}));

// 2. Mock QRCodeSVG (避免 Canvas/SVG 渲染問題)
jest.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qr-code" data-value={value}>QR: {value}</div>,
}));

// 2b. Mock html-to-image
const toPngMock = jest.fn().mockResolvedValue('data:image/png;base64,mockPng');
jest.mock('html-to-image', () => ({
  toPng: (...args: unknown[]) => toPngMock(...args),
}));

// 2c-pre. Radix Dialog requires ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// 2c. Mock ShareConfirmDialog (避免 Dialog portal 在整合測試中的複雜性)
jest.mock('../share-confirm-dialog', () => ({
  ShareConfirmDialog: ({ open, shareUrl, onConfirmShare }: { open: boolean; shareUrl: string; onConfirmShare: (url: string) => void }) =>
    open ? (
      <div data-testid="share-confirm-dialog" data-url={shareUrl}>
        ShareConfirmDialog
        <button data-testid="mock-confirm-share" onClick={() => onConfirmShare(shareUrl)}>確認分享</button>
      </div>
    ) : null,
}));

// 2d. Mock QrBrandCard (用 data-* 暴露 props 供驗證)
jest.mock('../qr-brand-card', () => {
  const React = require('react');
  const MockQrBrandCard = React.forwardRef(({ qrValue, variant, bankName, accountNumber, billTitle, billTotal, memberCount }: any, ref: any) => (
    <div ref={ref} data-testid="qr-brand-card" data-variant={variant}
      data-qr-value={qrValue} data-bank-name={bankName}
      data-account-number={accountNumber} data-bill-title={billTitle}
      data-bill-total={billTotal} data-member-count={memberCount}>
      QrBrandCard
    </div>
  ));
  MockQrBrandCard.displayName = 'MockQrBrandCard';
  return { QrBrandCard: MockQrBrandCard };
});

// 2e. Mock PreviewSheet (暴露 props 供整合測試驗證)
jest.mock('../preview-sheet', () => ({
  PreviewSheet: ({
    open, onOpenChange, form, subMode, qrString, currentShareUrl,
    sharedAccounts, onAccountSwitch, billTitle, memberCount, currentBankName,
    isPasswordEnabled, sharePassword, showSharePassword,
    onPasswordToggle, onPasswordChange, onToggleShowPassword,
    onShare, onDownload, isCopied, isDownloaded, copyError, qrCardRef,
  }: any) =>
    open ? (
      <div data-testid="preview-sheet">
        {/* Attach qrCardRef to a real DOM element for download tests */}
        <div ref={qrCardRef} data-testid="qr-card-ref-target" />

        {/* Account Switcher */}
        {sharedAccounts && sharedAccounts.length > 1 && (
          <div data-testid="preview-account-switcher">
            {sharedAccounts.map((acc: any, i: number) => (
              <button key={i} data-testid={`switch-account-${i}`} onClick={() => onAccountSwitch(acc.b, acc.a)}>
                {acc.b}-{acc.a}
              </button>
            ))}
          </div>
        )}

        {/* Mock QrBrandCard inside PreviewSheet */}
        {(subMode === 'itemized' ? currentShareUrl : qrString) && (
          <div data-testid="qr-brand-card"
            data-variant={subMode === 'itemized' ? 'share' : 'payment'}
            data-qr-value={subMode === 'itemized' ? currentShareUrl : qrString}
            data-bank-name={currentBankName}
            data-account-number={form.watch('accountNumber')}
            data-bill-title={billTitle || ''}
            data-bill-total={form.watch('amount') || ''}
            data-member-count={memberCount || 0}>
            QrBrandCard
          </div>
        )}

        {/* Password toggle */}
        <button data-testid="password-toggle" onClick={onPasswordToggle}>設定密碼保護</button>
        {isPasswordEnabled && (
          <input
            data-testid="password-input"
            placeholder="輸入分享密碼"
            value={sharePassword}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
        )}

        {/* Share + Download */}
        <button data-testid="share-btn" onClick={onShare} disabled={!(subMode === 'itemized' ? currentShareUrl : qrString)}>
          {isCopied ? '已複製' : '分享連結'}
        </button>
        <button data-testid="download-btn" onClick={onDownload}>
          {isDownloaded ? '已下載' : '下載圖片'}
        </button>
        {copyError && <p data-testid="copy-error">{copyError}</p>}

        <button data-testid="close-preview" onClick={() => onOpenChange(false)}>關閉</button>
      </div>
    ) : null,
}));

// 3. Mock LZString (確保加解密行為一致)
import LZString from 'lz-string';
import { decrypt } from '@/lib/crypto';

// 5. Import Route Config (測試用 — 從 config 動態取得前綴，避免硬編碼)
import { getRouteConfig } from '@/config/routes';
import type { AppMode } from '@/config/routes';

// 4. Mock LocalStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** 點擊「確定」按鈕打開 PreviewSheet */
const openPreview = async (user: ReturnType<typeof userEvent.setup>) => {
  const confirmBtn = screen.getByRole('button', { name: /確定/i });
  await user.click(confirmBtn);
  await waitFor(() => {
    expect(screen.getByTestId('preview-sheet')).toBeInTheDocument();
  });
};

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('Generator Integration Tests', () => {

  beforeEach(() => {
    // Reset Mocks & Storage
    jest.clearAllMocks();
    localStorageMock.clear();

    // Reset URL Params
    const keys = Array.from(mockSearchParams.keys());
    for (const key of keys) mockSearchParams.delete(key);

    // Setup Default Bank (模擬使用者已經設定過銀行，避免每次都要填)
    // personal 模式使用獨立 key (payme_data_personal)
    localStorageMock.setItem('payme_data_personal', JSON.stringify({
        bankCode: '822',
        accountNumber: '123456789012',
        amount: '',
        comment: ''
    }));
    // split 模式仍使用 payme_data_payment
    localStorageMock.setItem('payme_data_payment', JSON.stringify({
        bankCode: '822',
        accountNumber: '123456789012',
        amount: '',
        comment: ''
    }));
    // 統一帳戶管理 (ADR-029): 帳戶存於 payme_accounts
    localStorageMock.setItem('payme_accounts', JSON.stringify([
      { id: 'acc-default', bankCode: '822', accountNumber: '123456789012', isShared: true }
    ]));
  });

  test('應正確渲染預設狀態 (個人收款模式)', async () => {
    render(<Generator />);

    // 驗證子模式選擇器存在
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /個人收款/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /平均分帳/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /多人拆帳/i })).toBeInTheDocument();
    }, { timeout: 2000 });

    // 驗證帳戶設定 button 存在（已移至表單底部）
    expect(screen.getByText('帳戶設定')).toBeInTheDocument();
  });

  test('當輸入金額與備註後，點擊確定應在 PreviewSheet 中顯示 QR Code', async () => {
    const user = userEvent.setup();
    render(<Generator />);

    // 等待載入完成
    await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

    // 輸入金額
    const amountInput = screen.getByPlaceholderText('0');
    await user.type(amountInput, '500');

    // 輸入備註
    const commentInput = screen.getByPlaceholderText(/例如：聚餐費/i);
    await user.type(commentInput, 'Lunch');

    // 點擊確定開啟 PreviewSheet
    await openPreview(user);

    // 驗證 QR Code 出現
    const qr = screen.getByTestId('qr-brand-card');
    expect(qr).toBeInTheDocument();
    expect(qr.getAttribute('data-qr-value')).toContain('TWQRP');
  });

  test('切換至「多人拆帳」模式，應顯示分帳表單', async () => {
    const user = userEvent.setup();
    render(<Generator />);

    // 點擊多人拆帳子模式
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /多人拆帳/i })).toBeInTheDocument();
    }, { timeout: 2000 });
    await user.click(screen.getByRole('button', { name: /多人拆帳/i }));

    // 驗證畫面變更 (等待 Loading 結束)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/例如：週五燒肉局/i)).toBeInTheDocument();
      expect(screen.getByText(/分帳成員/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('多人拆帳流程：新增項目並全選成員，應正確計算總金額', async () => {
    const user = userEvent.setup();
    render(<Generator />);

    // 1. 切換到多人拆帳
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /多人拆帳/i })).toBeInTheDocument();
    }, { timeout: 2000 });
    await user.click(screen.getByRole('button', { name: /多人拆帳/i }));

    // 等待表單載入
    await waitFor(() => screen.getByPlaceholderText(/例如：週五燒肉局/i));

    // 2. 設定活動標題
    await user.type(screen.getByPlaceholderText(/例如：週五燒肉局/i), 'KTV Night');

    // 3. 新增成員 "Bob" (預設已有 "我")
    const memberInput = screen.getByPlaceholderText(/輸入朋友名字/i);
    await user.type(memberInput, 'Bob{enter}');

    // 4. 新增消費項目
    await user.click(screen.getByRole('button', { name: /新增項目/i }));

    // 5. 輸入項目金額
    await waitFor(() => {
        expect(screen.getAllByPlaceholderText('0').length).toBeGreaterThan(0);
    });
    const inputs = screen.getAllByPlaceholderText('0');
    const priceInput = inputs[inputs.length - 1];
    await user.type(priceInput, '1000');

    // 6. 驗證總金額
    await waitFor(() => {
        const amounts = screen.getAllByText('$1000');
        expect(amounts.length).toBeGreaterThan(0);
    });
  });

  test('分享連結模擬：訪客模式應顯示警語並還原資料', async () => {
    const shareData = {
        mo: 'pay',
        b: '812',
        a: '1234567890',
        m: '666',
        c: 'Shared Link Test'
    };

    render(<Generator initialMode="pay" initialData={shareData} isShared={true} />);

    // 2. 驗證警語 Dialog 出現
    await waitFor(() => {
        expect(screen.getByText(/安全提醒與免責聲明/i)).toBeInTheDocument();
    });

    // 3. 點擊「我知道了」關閉警語
    const agreeBtn = screen.getByRole('button', { name: /我知道了/i });
    await userEvent.click(agreeBtn);

    // 4. 驗證資料還原
    await waitFor(() => {
        const banks = screen.getAllByText(/812/);
        expect(banks.length).toBeGreaterThan(0);

        expect(screen.getByText('1234567890')).toBeInTheDocument();
        expect(screen.getByDisplayValue('666')).toBeInTheDocument();
    }, { timeout: 3000 });

    // 5. 驗證 QR Code 自動產生 (Guest view still has inline QR)
    await waitFor(() => {
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Multi-Account Integration Tests (Phase 6)
  // ---------------------------------------------------------------------------

  describe('Multi-Account Integration', () => {
    test('Host 端：新增帳號並切換勾選，應自動同步主要帳號', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      const accountTrigger = await screen.findByText('帳戶設定', {}, { timeout: 3000 });
      await user.click(accountTrigger.closest('button')!);

      const addBtn = await screen.findByText(/新增其他收款帳戶/i, {}, { timeout: 3000 });
      await user.click(addBtn);

      await waitFor(() => {
        const accountInputs = screen.getAllByPlaceholderText(/輸入銀行帳號/i);
        expect(accountInputs).toHaveLength(2);
      });

      const accountInputs = screen.getAllByPlaceholderText(/輸入銀行帳號/i);
      await user.type(accountInputs[1], '9999999999');

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
      await user.click(checkboxes[0]);

      expect(accountInputs[1]).toHaveValue('9999999999');
    });

    test('Host 端：分享連結應包含 ac (多帳號列表)', async () => {
      let capturedShareUrl: string | null = null;
      Object.defineProperty(navigator, 'share', {
        value: async (data: any) => { capturedShareUrl = data.url; },
        writable: true,
        configurable: true,
      });

      localStorageMock.setItem('payme_accounts', JSON.stringify([
        { id: 'acc-1', bankCode: '822', accountNumber: '123456789012', isShared: true },
        { id: 'acc-2', bankCode: '004', accountNumber: '5555566666', isShared: true }
      ]));

      const user = userEvent.setup();
      render(<Generator />);

      // 等待載入完成
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /個人收款/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      // 開啟 PreviewSheet → 分享
      await openPreview(user);
      const shareBtn = screen.getByTestId('share-btn');
      await user.click(shareBtn);

      // 點擊 mock Dialog 的確認分享按鈕
      const confirmBtn = await screen.findByTestId('mock-confirm-share');
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(capturedShareUrl).not.toBeNull();
      });

      const hashPart = capturedShareUrl!.split('#/?data=')[1];
      const compressed = hashPart.startsWith('0') ? hashPart.slice(1) : hashPart;
      const payload = JSON.parse(LZString.decompressFromEncodedURIComponent(compressed)!);

      expect(payload.ac).toBeDefined();
      expect(payload.ac).toHaveLength(2);
      expect(payload.ac[0].a).toBe('123456789012');
      expect(payload.ac[1].a).toBe('5555566666');
    });

    test('Guest 端：接收多帳號連結，應顯示切換器並能切換', async () => {
      const multiAccountData = {
        mo: 'pay',
        b: '822',
        a: '1111111111',
        ac: [
          { b: '822', a: '1111111111' },
          { b: '004', a: '2222222222' }
        ]
      };

      const user = userEvent.setup();
      render(<Generator initialMode="pay" initialData={multiAccountData} isShared={true} />);

      await waitFor(() => screen.getByText(/安全提醒與免責聲明/i));
      await user.click(screen.getByRole('button', { name: /我知道了/i }));

      // Guest view still has inline AccountSwitcher
      const switchLabel = await screen.findByText(/選擇轉入帳戶/i);
      expect(switchLabel).toBeInTheDocument();

      const switchBtn = (await screen.findByText('*2222')).closest('button');
      await user.click(switchBtn!);

      await waitFor(() => {
         const qr = screen.getByTestId('qr-brand-card');
         expect(qr.getAttribute('data-qr-value')).toContain('D5%3D004');
      });

      await waitFor(() => {
        const copyBtn = screen.getByRole('button', { name: /複製帳號.*2222222222/i });
        expect(copyBtn).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 分享 URL 格式測試
  // ---------------------------------------------------------------------------

  describe('分享 URL 格式 (ADR-008)', () => {
    let capturedShareUrl: string | null = null;
    let capturedClipboardText: string | null = null;

    beforeEach(() => {
      capturedShareUrl = null;
      capturedClipboardText = null;

      Object.defineProperty(navigator, 'share', {
        value: async (data: any) => { capturedShareUrl = data.url; },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (text: string) => { capturedClipboardText = text; },
        },
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    });

    test('收款模式分享 URL 應包含正確路由前綴與 hash 格式', async () => {
      const prefix = getRouteConfig('pay').prefix;
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      const amountInput = screen.getByPlaceholderText('0');
      await user.type(amountInput, '500');

      const commentInput = screen.getByPlaceholderText(/例如：聚餐費/i);
      await user.type(commentInput, '午餐費');

      // 開啟 PreviewSheet
      await openPreview(user);

      // 點擊分享按鈕
      const shareBtn = screen.getByTestId('share-btn');
      await user.click(shareBtn);

      // 點擊 mock Dialog 的確認分享按鈕
      const confirmBtn = await screen.findByTestId('mock-confirm-share');
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(capturedShareUrl).not.toBeNull();
        expect(capturedShareUrl).toMatch(new RegExp(`/${prefix}/`));
        expect(capturedShareUrl).toMatch(/#\/\?data=/);
        expect(capturedShareUrl).not.toMatch(/^\/?data=/);
      });
    });

    test('分帳模式分享 URL 應包含正確路由前綴與 hash 格式', async () => {
      const prefix = getRouteConfig('bill').prefix;
      const user = userEvent.setup();
      render(<Generator />);

      // 切換到多人拆帳模式
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /多人拆帳/i })).toBeInTheDocument();
      }, { timeout: 2000 });
      await user.click(screen.getByRole('button', { name: /多人拆帳/i }));

      await waitFor(() => screen.getByPlaceholderText(/例如：週五燒肉局/i));

      await user.type(screen.getByPlaceholderText(/例如：週五燒肉局/i), 'KTV趴');
      await user.type(screen.getByPlaceholderText(/輸入朋友名字/i), 'Bob{enter}');
      await user.click(screen.getByRole('button', { name: /新增項目/i }));

      await waitFor(() => {
        expect(screen.getAllByPlaceholderText('0').length).toBeGreaterThan(0);
      });
      const inputs = screen.getAllByPlaceholderText('0');
      const priceInput = inputs[inputs.length - 1];
      await user.type(priceInput, '1000');

      await waitFor(() => {
        expect(screen.getAllByText('$1000').length).toBeGreaterThan(0);
      });

      // 開啟 PreviewSheet
      await openPreview(user);

      const shareBtn = screen.getByTestId('share-btn');
      await user.click(shareBtn);

      const confirmBtn = await screen.findByTestId('mock-confirm-share');
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(capturedShareUrl).not.toBeNull();
        expect(capturedShareUrl).toMatch(new RegExp(`/${prefix}/`));
        expect(capturedShareUrl).toMatch(/KTV/);
        expect(capturedShareUrl).toMatch(/#\/\?data=/);
      });
    });

    test('分享 URL 資料完整性 (Round-trip)', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      const amountInput = screen.getByPlaceholderText('0');
      await user.type(amountInput, '1234');

      const commentInput = screen.getByPlaceholderText(/例如：聚餐費/i);
      await user.type(commentInput, '測試round-trip');

      // 開啟 PreviewSheet
      await openPreview(user);

      const shareBtn = screen.getByTestId('share-btn');
      await user.click(shareBtn);

      const confirmBtn = await screen.findByTestId('mock-confirm-share');
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(capturedShareUrl).not.toBeNull();
      });

      const hashPart = capturedShareUrl!.split('#/?data=')[1];
      expect(hashPart).toBeTruthy();

      const compressed = hashPart.startsWith('0') ? hashPart.slice(1) : hashPart;
      const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
      expect(decompressed).toBeTruthy();

      const payload = JSON.parse(decompressed!);
      expect(payload.b).toBe('822');
      expect(payload.a).toBe('123456789012');
      expect(payload.m).toBe('1234');
      expect(payload.c).toBe('測試round-trip');
      expect(payload.mo).toBe('pay');
    });

    test('密碼保護分享 → URL 應為加密格式 (data=1)', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });
      await user.type(screen.getByPlaceholderText('0'), '500');

      // 開啟 PreviewSheet
      await openPreview(user);

      // 點擊密碼 toggle
      await user.click(screen.getByTestId('password-toggle'));

      // 輸入密碼
      const passwordInput = screen.getByTestId('password-input');
      await user.type(passwordInput, 'mySecret123');

      // 點擊分享
      await user.click(screen.getByTestId('share-btn'));

      const confirmBtn = await screen.findByTestId('mock-confirm-share');
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(capturedShareUrl).not.toBeNull();
        expect(capturedShareUrl).toMatch(/#\/\?data=1/);
      });
    });

    test('未啟用密碼 → URL 應為明文格式 (data=0)', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });
      await user.type(screen.getByPlaceholderText('0'), '300');

      // 開啟 PreviewSheet → 直接分享 (無密碼)
      await openPreview(user);

      await user.click(screen.getByTestId('share-btn'));

      const confirmBtn = await screen.findByTestId('mock-confirm-share');
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(capturedShareUrl).not.toBeNull();
        expect(capturedShareUrl).toMatch(/#\/\?data=0/);
      });
    });

    test('密碼保護 Round-trip：加密 → 解密 → 資料一致', async () => {
      const PASSWORD = 'testPass456';
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });
      await user.type(screen.getByPlaceholderText('0'), '888');

      // 開啟 PreviewSheet
      await openPreview(user);

      // 開啟密碼 toggle
      await user.click(screen.getByTestId('password-toggle'));

      // 輸入密碼
      await user.type(screen.getByTestId('password-input'), PASSWORD);

      // 分享
      await user.click(screen.getByTestId('share-btn'));

      const confirmBtn = await screen.findByTestId('mock-confirm-share');
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(capturedShareUrl).not.toBeNull();
        expect(capturedShareUrl).toMatch(/#\/\?data=1/);
      });

      const blob = capturedShareUrl!.split('data=1')[1];
      expect(blob).toBeTruthy();

      const compressed = await decrypt(PASSWORD, blob);
      const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
      expect(decompressed).toBeTruthy();

      const payload = JSON.parse(decompressed!);
      expect(payload.b).toBe('822');
      expect(payload.m).toBe('888');
      expect(payload.mo).toBe('pay');
    });
  });

  // ---------------------------------------------------------------------------
  // bankCode 預填測試 (Phase 7G)
  // ---------------------------------------------------------------------------

  describe('bankCode Pre-fill (7G)', () => {
    test('應根據 initialBankCode 預填銀行選單', async () => {
      localStorageMock.clear();

      render(<Generator initialBankCode="812" />);

      await waitFor(() => {
        expect(screen.getByText('帳戶設定')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('無效的 initialBankCode 應被忽略', async () => {
      render(<Generator initialBankCode="999" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /個人收款/i })).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // QrBrandCard 品牌化 QR 整合 (Phase 8.5)
  // ---------------------------------------------------------------------------

  describe('QrBrandCard 品牌化 QR 整合', () => {
    test('收款模式：PreviewSheet 中應渲染 QrBrandCard variant="payment"', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });
      await user.type(screen.getByPlaceholderText('0'), '100');

      await openPreview(user);

      const card = screen.getByTestId('qr-brand-card');
      expect(card).toBeInTheDocument();
      expect(card.getAttribute('data-variant')).toBe('payment');
    });

    test('收款模式：QrBrandCard 應接收正確的銀行與帳號', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });
      await user.type(screen.getByPlaceholderText('0'), '100');

      await openPreview(user);

      const card = screen.getByTestId('qr-brand-card');
      expect(card.getAttribute('data-bank-name')).toContain('822');
      expect(card.getAttribute('data-account-number')).toBe('123456789012');
    });

    test('多人拆帳 Host：PreviewSheet 中應渲染 QrBrandCard variant="share"', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /多人拆帳/i })).toBeInTheDocument();
      }, { timeout: 2000 });
      await user.click(screen.getByRole('button', { name: /多人拆帳/i }));
      await waitFor(() => screen.getByPlaceholderText(/例如：週五燒肉局/i));

      await user.type(screen.getByPlaceholderText(/例如：週五燒肉局/i), '聚餐');
      await user.type(screen.getByPlaceholderText(/輸入朋友名字/i), 'Bob{enter}');
      await user.click(screen.getByRole('button', { name: /新增項目/i }));

      await waitFor(() => {
        expect(screen.getAllByPlaceholderText('0').length).toBeGreaterThan(0);
      });
      const inputs = screen.getAllByPlaceholderText('0');
      await user.type(inputs[inputs.length - 1], '500');

      await waitFor(() => {
        expect(screen.getAllByText('$500').length).toBeGreaterThan(0);
      });

      await openPreview(user);

      const card = screen.getByTestId('qr-brand-card');
      expect(card.getAttribute('data-variant')).toBe('share');
    });

    test('多人拆帳 Host：QrBrandCard qrValue 應為 Share URL', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /多人拆帳/i })).toBeInTheDocument();
      }, { timeout: 2000 });
      await user.click(screen.getByRole('button', { name: /多人拆帳/i }));
      await waitFor(() => screen.getByPlaceholderText(/例如：週五燒肉局/i));

      await user.type(screen.getByPlaceholderText(/例如：週五燒肉局/i), '聚餐');
      await user.type(screen.getByPlaceholderText(/輸入朋友名字/i), 'Bob{enter}');
      await user.click(screen.getByRole('button', { name: /新增項目/i }));

      await waitFor(() => {
        expect(screen.getAllByPlaceholderText('0').length).toBeGreaterThan(0);
      });
      const inputs = screen.getAllByPlaceholderText('0');
      await user.type(inputs[inputs.length - 1], '500');

      await waitFor(() => {
        expect(screen.getAllByText('$500').length).toBeGreaterThan(0);
      });

      await openPreview(user);

      const card = screen.getByTestId('qr-brand-card');
      const qrValue = card.getAttribute('data-qr-value');
      expect(qrValue).toMatch(/^https?:\/\//);
    });

    test('多人拆帳 Host：應傳入帳單標題與金額', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /多人拆帳/i })).toBeInTheDocument();
      }, { timeout: 2000 });
      await user.click(screen.getByRole('button', { name: /多人拆帳/i }));
      await waitFor(() => screen.getByPlaceholderText(/例如：週五燒肉局/i));

      await user.type(screen.getByPlaceholderText(/例如：週五燒肉局/i), '聚餐');
      await user.type(screen.getByPlaceholderText(/輸入朋友名字/i), 'Bob{enter}');
      await user.click(screen.getByRole('button', { name: /新增項目/i }));

      await waitFor(() => {
        expect(screen.getAllByPlaceholderText('0').length).toBeGreaterThan(0);
      });
      const inputs = screen.getAllByPlaceholderText('0');
      await user.type(inputs[inputs.length - 1], '500');

      await waitFor(() => {
        expect(screen.getAllByText('$500').length).toBeGreaterThan(0);
      });

      await openPreview(user);

      const card = screen.getByTestId('qr-brand-card');
      expect(card.getAttribute('data-bill-title')).toBe('聚餐');
      expect(card.getAttribute('data-bill-total')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // 分享確認 Dialog
  // ---------------------------------------------------------------------------

  describe('分享確認 Dialog', () => {
    test('收款模式：點擊分享應開啟確認 Dialog', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });
      await user.type(screen.getByPlaceholderText('0'), '100');

      await openPreview(user);
      await user.click(screen.getByTestId('share-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('share-confirm-dialog')).toBeInTheDocument();
      });
    });

    test('多人拆帳 Host：點擊分享應開啟確認 Dialog', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /多人拆帳/i })).toBeInTheDocument();
      }, { timeout: 2000 });
      await user.click(screen.getByRole('button', { name: /多人拆帳/i }));
      await waitFor(() => screen.getByPlaceholderText(/例如：週五燒肉局/i));

      await user.type(screen.getByPlaceholderText(/例如：週五燒肉局/i), '聚餐');
      await user.type(screen.getByPlaceholderText(/輸入朋友名字/i), 'Bob{enter}');
      await user.click(screen.getByRole('button', { name: /新增項目/i }));

      await waitFor(() => {
        expect(screen.getAllByPlaceholderText('0').length).toBeGreaterThan(0);
      });
      const inputs = screen.getAllByPlaceholderText('0');
      await user.type(inputs[inputs.length - 1], '500');

      await waitFor(() => {
        expect(screen.getAllByText('$500').length).toBeGreaterThan(0);
      });

      await openPreview(user);
      await user.click(screen.getByTestId('share-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('share-confirm-dialog')).toBeInTheDocument();
      });
    });

    test('確認分享後不應顯示縮網址服務入口', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });
      await user.type(screen.getByPlaceholderText('0'), '100');

      // 不應有「縮網址服務」文字
      expect(screen.queryByText('縮網址服務')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 下載圖片 (Phase 8.5)
  // ---------------------------------------------------------------------------

  describe('下載圖片', () => {
    beforeEach(() => {
      toPngMock.mockClear();
    });

    test('下載檔名應包含銀行代碼與帳號', async () => {
      let capturedDownload = '';
      const originalCreateElement = document.createElement.bind(document);

      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });
      await user.type(screen.getByPlaceholderText('0'), '100');

      await openPreview(user);

      // Set up the spy
      const createSpy = jest.spyOn(document, 'createElement');
      createSpy.mockImplementation((tagName: string, options?: any) => {
        const el = originalCreateElement(tagName, options);
        if (tagName === 'a') {
          el.click = jest.fn(() => {
            capturedDownload = (el as HTMLAnchorElement).download;
          });
        }
        return el;
      });

      await user.click(screen.getByTestId('download-btn'));

      await waitFor(() => {
        expect(capturedDownload).toContain('822');
        expect(capturedDownload).toContain('123456789012');
      });

      createSpy.mockRestore();
    });

    test('點擊下載應呼叫 html-to-image toPng()', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });
      await user.type(screen.getByPlaceholderText('0'), '100');

      await openPreview(user);
      await user.click(screen.getByTestId('download-btn'));

      await waitFor(() => {
        expect(toPngMock).toHaveBeenCalled();
      });
    });

    test('toPng 失敗時應降級不拋錯', async () => {
      toPngMock.mockRejectedValueOnce(new Error('Canvas error'));
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });
      await user.type(screen.getByPlaceholderText('0'), '100');

      await openPreview(user);

      await expect(async () => {
        await user.click(screen.getByTestId('download-btn'));
      }).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Template Attribution (TEMPLATE BY)
  // ---------------------------------------------------------------------------

  describe('Template Attribution (TEMPLATE BY)', () => {
    const openTemplateSheet = async (user: ReturnType<typeof userEvent.setup>) => {
      const sceneTrigger = await screen.findByText('使用模板', {}, { timeout: 3000 });
      await user.click(sceneTrigger.closest('button')!);
      await waitFor(() => {
        expect(screen.getByText('Netflix 合租')).toBeInTheDocument();
      }, { timeout: 3000 });
    };

    test('套用模板後應顯示署名 badge', async () => {
      const user = userEvent.setup();
      render(<Generator />);
      await openTemplateSheet(user);

      await user.click(screen.getByText('Netflix 合租'));

      await waitFor(() => {
        expect(screen.getByText('TEMPLATE BY')).toBeInTheDocument();
        expect(screen.getByText('PayMe Team')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('切換到其他子模式時 badge 應隱藏', async () => {
      const user = userEvent.setup();
      render(<Generator />);
      await openTemplateSheet(user);

      // 套用 payment 模板 (splits to 'split' subMode)
      await user.click(screen.getByText('Netflix 合租'));
      await waitFor(() => expect(screen.getByText('TEMPLATE BY')).toBeInTheDocument(), { timeout: 3000 });

      // Wait for loading to finish, then click 多人拆帳
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /多人拆帳/i })).toBeInTheDocument();
      }, { timeout: 3000 });
      await user.click(screen.getByRole('button', { name: /多人拆帳/i }));

      await waitFor(() => {
        expect(screen.queryByText('TEMPLATE BY')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('切回原模式時 badge 應回歸', async () => {
      const user = userEvent.setup();
      render(<Generator />);
      await openTemplateSheet(user);

      // 套用 payment 模板
      await user.click(screen.getByText('Netflix 合租'));
      await waitFor(() => expect(screen.getByText('TEMPLATE BY')).toBeInTheDocument(), { timeout: 3000 });

      // Wait for loading to finish, then switch
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /多人拆帳/i })).toBeInTheDocument();
      }, { timeout: 3000 });
      await user.click(screen.getByRole('button', { name: /多人拆帳/i }));
      await waitFor(() => expect(screen.queryByText('TEMPLATE BY')).not.toBeInTheDocument(), { timeout: 3000 });

      // Wait for loading, then switch back
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /平均分帳/i })).toBeInTheDocument();
      }, { timeout: 3000 });
      await user.click(screen.getByRole('button', { name: /平均分帳/i }));
      await waitFor(() => {
        expect(screen.getByText('TEMPLATE BY')).toBeInTheDocument();
        expect(screen.getByText('PayMe Team')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('使用者修改模板參數後 badge 應永久消失', async () => {
      const user = userEvent.setup();
      render(<Generator />);
      await openTemplateSheet(user);

      // 套用 pay 模板 (Spotify Family)
      await user.click(screen.getByText('Spotify Family'));
      await waitFor(() => {
        expect(screen.getByText('TEMPLATE BY')).toBeInTheDocument();
        expect(screen.getByText('PayMe Team')).toBeInTheDocument();
      }, { timeout: 3000 });

      // 修改金額讓 dirty detection 觸發
      const amountInput = await waitFor(
        () => screen.getByPlaceholderText('0'),
        { timeout: 3000 }
      );
      await user.clear(amountInput);
      await user.type(amountInput, '300');

      // badge 應永久消失
      await waitFor(() => {
        expect(screen.queryByText('TEMPLATE BY')).not.toBeInTheDocument();
      });

      // 即使切到其他模式再切回來，badge 仍不會出現
      // Wait for button to be available after loading
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /多人拆帳/i })).toBeInTheDocument();
      }, { timeout: 3000 });
      await user.click(screen.getByRole('button', { name: /多人拆帳/i }));
      await waitFor(() => expect(screen.queryByText('TEMPLATE BY')).not.toBeInTheDocument(), { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /個人收款/i })).toBeInTheDocument();
      }, { timeout: 3000 });
      await user.click(screen.getByRole('button', { name: /個人收款/i }));
      await waitFor(() => {
        expect(screen.queryByText('TEMPLATE BY')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  // ---------------------------------------------------------------------------
  // 分帳分享連結 Guest 流程 (Bug #3)
  // ---------------------------------------------------------------------------

  describe('分帳 Guest 流程 (Shared Bill Link)', () => {
    const billShareData = {
      mo: 'bill',
      b: '004',
      a: '123123123123123',
      m: '135',
      c: '',
      bd: {
        t: '錢櫃 Party',
        m: ['Host', 'Alice', 'Bob'],
        i: [
          { n: '包廂費', p: 100, o: [0, 1, 2] },
          { n: '餐點', p: 35, o: [1, 2] },
        ],
        s: false,
      },
    };

    test('訪客選擇成員後，QR Code 應自動產生', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(
        <Generator initialMode="bill" initialData={billShareData} isShared={true} />
      );

      await waitFor(() => {
        expect(screen.getByText('帳單明細 (唯讀)')).toBeInTheDocument();
      }, { timeout: 3000 });

      await user.click(screen.getByText('Alice'));

      await waitFor(() => {
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText(/掃描下方 QR Code 進行分帳/)).toBeInTheDocument();
    });

    test('長標題：comment 超過 20 字限制時，QR Code 仍應產生', async () => {
      const longTitleData = {
        ...billShareData,
        bd: {
          ...billShareData.bd,
          t: '週五錢櫃歡唱趴踢',
        },
      };
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(
        <Generator initialMode="bill" initialData={longTitleData} isShared={true} />
      );

      await waitFor(() => {
        expect(screen.getByText('帳單明細 (唯讀)')).toBeInTheDocument();
      }, { timeout: 3000 });

      await user.click(screen.getByText('Alice'));

      await waitFor(() => {
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('訪客選擇成員後，應顯示正確的應付金額', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(
        <Generator initialMode="bill" initialData={billShareData} isShared={true} />
      );

      await waitFor(() => {
        expect(screen.getByText('帳單明細 (唯讀)')).toBeInTheDocument();
      }, { timeout: 3000 });

      await user.click(screen.getByText('Alice'));

      await waitFor(() => {
        expect(screen.getByText('$51')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  // ---------------------------------------------------------------------------
  // 模式切換資料隔離
  // ---------------------------------------------------------------------------

  describe('模式切換資料隔離', () => {
    test('個人收款 → 平均分帳：金額不互相污染', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      // 等待個人收款模式載入
      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 在個人收款輸入金額
      const amountInput = screen.getByPlaceholderText('0');
      await user.type(amountInput, '500');

      // 切換到平均分帳
      await user.click(screen.getByRole('button', { name: /平均分帳/i }));

      // 等待模式切換完成
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /平均分帳/i })).toHaveAttribute('aria-pressed', 'true');
      }, { timeout: 3000 });

      // 平均分帳的金額不應顯示個人收款的 500
      await waitFor(() => {
        const inputs = screen.getAllByPlaceholderText('0');
        // 所有金額輸入框的值應為空
        const hasOldAmount = inputs.some(input => (input as HTMLInputElement).value === '500');
        expect(hasOldAmount).toBe(false);
      });
    });

    test('多人拆帳 → 回到個人收款：個人資料應保留（從 localStorage 還原）', async () => {
      // 預設 personal 有已存金額
      localStorageMock.setItem('payme_data_personal', JSON.stringify({
        bankCode: '822', accountNumber: '123456789012', amount: '777', comment: '咖啡',
      }));

      const user = userEvent.setup();
      render(<Generator />);

      // 等待個人收款模式載入並確認金額
      await waitFor(() => {
        const input = screen.getByPlaceholderText('0') as HTMLInputElement;
        expect(input.value).toBe('777');
      }, { timeout: 3000 });

      // 切到多人拆帳
      await user.click(screen.getByRole('button', { name: /多人拆帳/i }));
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/例如：週五燒肉局/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // 切回個人收款
      await user.click(screen.getByRole('button', { name: /個人收款/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /個人收款/i })).toHaveAttribute('aria-pressed', 'true');
      }, { timeout: 3000 });

      // 個人收款的金額應從 localStorage 還原
      await waitFor(() => {
        const input = screen.getByPlaceholderText('0') as HTMLInputElement;
        expect(input.value).toBe('777');
      }, { timeout: 3000 });
    });

    test('個人收款消費項目 → 平均分帳：items 不互相同步', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      // 等待個人收款模式載入
      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 勾選「使用明細計算」checkbox
      await user.click(screen.getByLabelText('使用明細計算'));

      // 新增一筆消費項目並填入金額（用 aria-label 精準定位）
      const itemPriceInput = screen.getByLabelText('項目 1 金額');
      await user.type(itemPriceInput, '200');

      // 確認填入成功
      expect((itemPriceInput as HTMLInputElement).value).toBe('200');

      // 切換到平均分帳
      await user.click(screen.getByRole('button', { name: /平均分帳/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /平均分帳/i })).toHaveAttribute('aria-pressed', 'true');
      }, { timeout: 3000 });

      // 平均分帳的消費總金額應為空（total mode 的預設狀態）
      await waitFor(() => {
        const totalInput = screen.getByLabelText('消費總金額') as HTMLInputElement;
        expect(totalInput.value).toBe('');
      });
    });

    test('個人收款消費項目 → 多人拆帳 → 回個人收款：消費項目保留', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      // 等待個人收款模式載入
      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 勾選「使用明細計算」checkbox
      await user.click(screen.getByLabelText('使用明細計算'));

      // 填入消費項目名稱和金額
      const nameInput = screen.getByPlaceholderText('項目名稱');
      await user.type(nameInput, '便當');

      const itemPriceInput = screen.getByLabelText('項目 1 金額');
      await user.type(itemPriceInput, '100');

      // 切到多人拆帳
      await user.click(screen.getByRole('button', { name: /多人拆帳/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /多人拆帳/i })).toHaveAttribute('aria-pressed', 'true');
      }, { timeout: 3000 });

      // 切回個人收款
      await user.click(screen.getByRole('button', { name: /個人收款/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /個人收款/i })).toHaveAttribute('aria-pressed', 'true');
      }, { timeout: 3000 });

      // 應該還原消費項目模式，且項目名稱和金額都保留
      await waitFor(() => {
        expect(screen.getByDisplayValue('便當')).toBeInTheDocument();
        expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('平均分帳勾選服務費 → 切到個人收款：服務費不應被勾選', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      // 等待載入
      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 切到平均分帳
      await user.click(screen.getByRole('button', { name: /平均分帳/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /平均分帳/i })).toHaveAttribute('aria-pressed', 'true');
      }, { timeout: 3000 });

      // 勾選服務費
      const serviceChargeCheckbox = screen.getByLabelText(/加收 10% 服務費/i);
      await user.click(serviceChargeCheckbox);
      expect(serviceChargeCheckbox).toBeChecked();

      // 切到個人收款
      await user.click(screen.getByRole('button', { name: /個人收款/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /個人收款/i })).toHaveAttribute('aria-pressed', 'true');
      }, { timeout: 3000 });

      // 個人收款的服務費應未勾選
      await waitFor(() => {
        const checkbox = screen.getByLabelText(/加收 10% 服務費/i);
        expect(checkbox).not.toBeChecked();
      });
    });
  });

  // ─── InputMethodToggle → Checkbox 重構測試 ─────────────────────
  describe('金額輸入 checkbox 重構', () => {
    test('個人收款：勾選明細後金額輸入隱藏，顯示總額 preview', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 金額輸入應可見且可編輯
      const amountInput = screen.getByLabelText('轉帳金額 (選填)') as HTMLInputElement;
      expect(amountInput).toBeInTheDocument();
      expect(amountInput).not.toHaveAttribute('readOnly');

      // 勾選「使用明細計算」
      await user.click(screen.getByLabelText('使用明細計算'));

      // 金額輸入應消失
      expect(screen.queryByLabelText('轉帳金額 (選填)')).not.toBeInTheDocument();

      // 總額 preview 應出現
      expect(screen.getByText('總額')).toBeInTheDocument();

      // 填入項目金額（等待 items list 渲染完成）
      await waitFor(() => {
        expect(screen.getByLabelText('項目 1 金額')).toBeInTheDocument();
      });
      const itemPriceInput = screen.getByLabelText('項目 1 金額') as HTMLInputElement;
      await user.type(itemPriceInput, '350');

      // 總額 preview 應顯示計算值（小計 + preview 都會顯示 $350）
      await waitFor(() => {
        const matches = screen.getAllByText(/\$350/);
        expect(matches.length).toBeGreaterThanOrEqual(2);
      });
    });

    test('平均分帳：勾選明細後消費總金額隱藏，每人應付仍在', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 切到平均分帳
      await user.click(screen.getByRole('button', { name: /平均分帳/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /平均分帳/i })).toHaveAttribute('aria-pressed', 'true');
      }, { timeout: 3000 });

      // 消費總金額應可見且可編輯
      const totalInput = screen.getByLabelText('消費總金額') as HTMLInputElement;
      expect(totalInput).toBeInTheDocument();
      expect(totalInput).not.toHaveAttribute('readOnly');

      // 勾選「使用明細計算」
      await user.click(screen.getByLabelText('使用明細計算'));

      // 消費總金額應消失
      expect(screen.queryByLabelText('消費總金額')).not.toBeInTheDocument();

      // 每人應付 preview 仍在
      expect(screen.getByText('每人應付')).toBeInTheDocument();
    });

    test('多人拆帳：不顯示 checkbox', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 切到多人拆帳
      await user.click(screen.getByRole('button', { name: /多人拆帳/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /多人拆帳/i })).toHaveAttribute('aria-pressed', 'true');
      }, { timeout: 3000 });

      // 不應顯示 checkbox
      expect(screen.queryByLabelText('使用明細計算')).not.toBeInTheDocument();

      // 但消費明細應直接可見
      expect(screen.getByText('消費明細')).toBeInTheDocument();
    });

    test('多人拆帳：應顯示總額 preview', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 切到多人拆帳
      await user.click(screen.getByRole('button', { name: /多人拆帳/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /多人拆帳/i })).toHaveAttribute('aria-pressed', 'true');
      }, { timeout: 3000 });

      // 應顯示「總額」preview
      await waitFor(() => {
        expect(screen.getByText('總額')).toBeInTheDocument();
      });
    });

    test('pill 按鈕已移除', async () => {
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 舊的 pill 按鈕不應存在
      expect(screen.queryByText('○ 總金額')).not.toBeInTheDocument();
      expect(screen.queryByText('○ 消費項目')).not.toBeInTheDocument();
    });
  });

  test('輸入無效金額(負數)時，應顯示錯誤訊息且不產生 QR Code', async () => {
    const user = userEvent.setup();
    render(<Generator />);

    await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

    const amountInput = screen.getByPlaceholderText('0');
    await user.type(amountInput, '-100');

    await user.tab();

    await waitFor(() => {
        const qr = screen.queryByTestId('qr-code');
        expect(qr).not.toBeInTheDocument();
    });

    await waitFor(() => {
        expect(screen.getByText(/金額必須為大於 0 的整數/i)).toBeInTheDocument();
    });
  });

});
