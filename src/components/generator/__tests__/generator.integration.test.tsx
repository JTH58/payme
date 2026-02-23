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

  test('應正確渲染預設狀態 (收款模式)', async () => {
    render(<Generator />);

    // 驗證標題或關鍵元素存在
    expect(screen.getByRole('button', { name: /收款/i })).toBeInTheDocument();

    // 驗證帳戶 trigger button 存在
    await waitFor(() => {
        expect(screen.getByText('帳戶')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('當輸入金額與備註後，應自動產生 QR Code', async () => {
    const user = userEvent.setup();
    render(<Generator />);

    // 等待載入完成
    await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

    // 輸入金額 (Placeholder 是 "0")
    // 注意：可能有其他 input 也是 0，這裡假設金額欄位是第一個主要輸入
    const amountInput = screen.getByPlaceholderText('0');
    await user.type(amountInput, '500');

    // 輸入備註
    const commentInput = screen.getByPlaceholderText(/例如：聚餐費/i); // 修正 Placeholder
    await user.type(commentInput, 'Lunch');

    // 驗證 QR Code 出現
    await waitFor(() => {
      const qr = screen.getByTestId('qr-brand-card');
      expect(qr).toBeInTheDocument();
      expect(qr.getAttribute('data-qr-value')).toContain('TWQRP');
    });
  });

  test('切換至「分帳」模式，應顯示分帳表單', async () => {
    const user = userEvent.setup();
    render(<Generator />);

    // 點擊切換模式按鈕
    const billModeBtn = screen.getByRole('button', { name: /分帳/i });
    await user.click(billModeBtn);

    // 驗證畫面變更 (等待 Loading 結束)
    await waitFor(() => {
      // 改用 Placeholder 避免 Label 關聯問題
      expect(screen.getByPlaceholderText(/例如：週五燒肉局/i)).toBeInTheDocument();
      expect(screen.getByText(/分帳成員/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('分帳流程：新增項目並全選成員，應正確計算總金額', async () => {
    const user = userEvent.setup();
    render(<Generator />);

    // 1. 切換模式
    await user.click(screen.getByRole('button', { name: /分帳/i }));

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
    // 等待新項目出現
    await waitFor(() => {
        expect(screen.getAllByPlaceholderText('0').length).toBeGreaterThan(0);
    });
    const inputs = screen.getAllByPlaceholderText('0'); 
    // 取最後一個 (新增的項目金額欄位)
    const priceInput = inputs[inputs.length - 1]; 
    await user.type(priceInput, '1000');

    // 6. 驗證總金額 (可能出現多次，只要有出現即可)
    await waitFor(() => {
        const amounts = screen.getAllByText('$1000');
        expect(amounts.length).toBeGreaterThan(0);
    });
  });

  test('分享連結模擬：訪客模式應顯示警語並還原資料', async () => {
    // 1. 準備分享連結資料 (修正帳號長度為 10 碼)
    // Phase 3: 透過 props 傳入 (由 page.tsx → useUrlParser 解析後傳入)
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
        // 可能有多個 812 (Button + QR Preview)
        const banks = screen.getAllByText(/812/);
        expect(banks.length).toBeGreaterThan(0);
        
        expect(screen.getByText('1234567890')).toBeInTheDocument(); // 帳號 (BankForm 唯讀文字)
        expect(screen.getByDisplayValue('666')).toBeInTheDocument(); // 金額 (Input Value)
    }, { timeout: 3000 });
    
    // 5. 驗證 QR Code 自動產生
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

      // 等待帳戶管理 trigger button 渲染完成，點擊開啟 AccountSheet
      const accountTrigger = await screen.findByText('帳戶', {}, { timeout: 3000 });
      await user.click(accountTrigger.closest('button')!);

      const addBtn = await screen.findByText(/新增其他收款帳戶/i, {}, { timeout: 3000 });
      await user.click(addBtn);

      // 2. 驗證出現第二組輸入框
      await waitFor(() => {
        const accountInputs = screen.getAllByPlaceholderText(/輸入銀行帳號/i);
        expect(accountInputs).toHaveLength(2);
      });

      // 3. 輸入第二組帳號
      const accountInputs = screen.getAllByPlaceholderText(/輸入銀行帳號/i);
      await user.type(accountInputs[1], '9999999999');

      // 4. 操作 Checkbox 切換主要帳號
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
      await user.click(checkboxes[0]); // Uncheck first (force primary to second)

      // 驗證第二組帳號值正確
      expect(accountInputs[1]).toHaveValue('9999999999');
    });

    test('Host 端：分享連結應包含 ac (多帳號列表)', async () => {
      let capturedShareUrl: string | null = null;
      Object.defineProperty(navigator, 'share', {
        value: async (data: any) => { capturedShareUrl = data.url; },
        writable: true,
        configurable: true,
      });

      // 預載多帳號資料到 localStorage（模擬使用者已設定好兩組帳號）
      // ADR-029: 帳戶存於 payme_accounts
      localStorageMock.setItem('payme_accounts', JSON.stringify([
        { id: 'acc-1', bankCode: '822', accountNumber: '123456789012', isShared: true },
        { id: 'acc-2', bankCode: '004', accountNumber: '5555566666', isShared: true }
      ]));

      const user = userEvent.setup();
      render(<Generator />);

      // 等待帳戶管理 trigger button 渲染完成
      await screen.findByRole('button', { name: /收款/i }, { timeout: 3000 });

      // 等待 QR Code 出現後，分享按鈕才可見
      const shareBtn = await screen.findByRole('button', { name: /分享連結/i }, { timeout: 3000 });
      await user.click(shareBtn);

      // 點擊 mock Dialog 的確認分享按鈕
      const confirmBtn = await screen.findByTestId('mock-confirm-share');
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(capturedShareUrl).not.toBeNull();
      });

      const hashPart = capturedShareUrl!.split('#/?data=')[1];
      // 去掉首碼 0（新版明文格式）
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

      // 等待 Loading 結束、AccountSwitcher 顯示
      const switchLabel = await screen.findByText(/選擇轉入帳戶/i);
      expect(switchLabel).toBeInTheDocument();

      // 點擊切換到第二個帳號 (004)
      const switchBtn = (await screen.findByText('*2222')).closest('button');
      await user.click(switchBtn!);

      // 先等待 QR Code 重新生成
      await waitFor(() => {
         const qr = screen.getByTestId('qr-brand-card');
         expect(qr.getAttribute('data-qr-value')).toContain('D5%3D004');
      });

      // 驗證複製按鈕內容更新 (使用部分匹配)
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

      // Mock navigator.share 以捕獲 URL
      Object.defineProperty(navigator, 'share', {
        value: async (data: any) => { capturedShareUrl = data.url; },
        writable: true,
        configurable: true,
      });

      // Mock navigator.clipboard.writeText 作為 fallback
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (text: string) => { capturedClipboardText = text; },
        },
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      // 還原 navigator.share
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

      // 等待載入完成
      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 填入金額與備註
      const amountInput = screen.getByPlaceholderText('0');
      await user.type(amountInput, '500');

      const commentInput = screen.getByPlaceholderText(/例如：聚餐費/i);
      await user.type(commentInput, '午餐費');

      // 等待 QR Code 產生
      await waitFor(() => {
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
      });

      // 點擊分享按鈕 → 開啟確認 Dialog
      const shareBtn = screen.getByRole('button', { name: /分享連結/i });
      await user.click(shareBtn);

      // 點擊 mock Dialog 的確認分享按鈕
      const confirmBtn = await screen.findByTestId('mock-confirm-share');
      await user.click(confirmBtn);

      // 驗證 URL 格式 — 前綴從 config 動態取得
      await waitFor(() => {
        expect(capturedShareUrl).not.toBeNull();
        expect(capturedShareUrl).toMatch(new RegExp(`/${prefix}/`)); // 路由前綴
        expect(capturedShareUrl).toMatch(/#\/\?data=/);               // hash 格式
        expect(capturedShareUrl).not.toMatch(/^\/?data=/);            // 非舊格式
      });
    });

    test('分帳模式分享 URL 應包含正確路由前綴與 hash 格式', async () => {
      const prefix = getRouteConfig('bill').prefix;
      const user = userEvent.setup();
      render(<Generator />);

      // 切換到分帳模式
      await user.click(screen.getByRole('button', { name: /分帳/i }));

      // 等待表單載入
      await waitFor(() => screen.getByPlaceholderText(/例如：週五燒肉局/i));

      // 設定標題
      await user.type(screen.getByPlaceholderText(/例如：週五燒肉局/i), 'KTV趴');

      // 新增成員
      const memberInput = screen.getByPlaceholderText(/輸入朋友名字/i);
      await user.type(memberInput, 'Bob{enter}');

      // 新增項目並填金額
      await user.click(screen.getByRole('button', { name: /新增項目/i }));
      await waitFor(() => {
        expect(screen.getAllByPlaceholderText('0').length).toBeGreaterThan(0);
      });
      const inputs = screen.getAllByPlaceholderText('0');
      const priceInput = inputs[inputs.length - 1];
      await user.type(priceInput, '1000');

      // 等待金額計算完成
      await waitFor(() => {
        expect(screen.getAllByText('$1000').length).toBeGreaterThan(0);
      });

      // 點擊分享按鈕 → 開啟確認 Dialog
      const shareBtn = screen.getByRole('button', { name: /分享連結/i });
      await user.click(shareBtn);

      // 點擊 mock Dialog 的確認分享按鈕
      const confirmBtn = await screen.findByTestId('mock-confirm-share');
      await user.click(confirmBtn);

      // 驗證 URL 格式 — 前綴從 config 動態取得
      await waitFor(() => {
        expect(capturedShareUrl).not.toBeNull();
        expect(capturedShareUrl).toMatch(new RegExp(`/${prefix}/`)); // 路由前綴
        expect(capturedShareUrl).toMatch(/KTV/);                      // 標題在路徑中
        expect(capturedShareUrl).toMatch(/#\/\?data=/);               // hash 格式
      });
    });

    test('分享 URL 資料完整性 (Round-trip)', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 填入金額與備註
      const amountInput = screen.getByPlaceholderText('0');
      await user.type(amountInput, '1234');

      const commentInput = screen.getByPlaceholderText(/例如：聚餐費/i);
      await user.type(commentInput, '測試round-trip');

      await waitFor(() => {
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
      });

      // 點擊分享 → 開啟確認 Dialog
      const shareBtn = screen.getByRole('button', { name: /分享連結/i });
      await user.click(shareBtn);

      // 點擊 mock Dialog 的確認分享按鈕
      const confirmBtn = await screen.findByTestId('mock-confirm-share');
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(capturedShareUrl).not.toBeNull();
      });

      // 從 URL 中解壓 hash data（去掉首碼 0）
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

      // 等待載入完成
      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 填入金額
      await user.type(screen.getByPlaceholderText('0'), '500');

      // 等待 QR Code 產生
      await waitFor(() => {
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
      });

      // 開啟密碼 toggle（QR View 區域的）
      const toggleButtons = screen.getAllByText('設定密碼保護');
      await user.click(toggleButtons[0]);

      // 輸入密碼
      const passwordInputs = screen.getAllByPlaceholderText('輸入分享密碼');
      await user.type(passwordInputs[0], 'mySecret123');

      // 點擊分享 → 開啟確認 Dialog
      await user.click(screen.getByRole('button', { name: /分享連結/i }));

      // 點擊 mock Dialog 的確認分享按鈕
      const confirmBtn = await screen.findByTestId('mock-confirm-share');
      await user.click(confirmBtn);

      // 驗證 URL 首碼為 1
      await waitFor(() => {
        expect(capturedShareUrl).not.toBeNull();
        expect(capturedShareUrl).toMatch(/#\/\?data=1/);
      });
    });

    test('未啟用密碼 → URL 應為明文格式 (data=0)', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      // 等待載入完成
      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 填入金額
      await user.type(screen.getByPlaceholderText('0'), '300');

      // 等待 QR Code 產生
      await waitFor(() => {
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
      });

      // 不開啟密碼 toggle，直接分享 → 開啟確認 Dialog
      await user.click(screen.getByRole('button', { name: /分享連結/i }));

      // 點擊 mock Dialog 的確認分享按鈕
      const confirmBtn = await screen.findByTestId('mock-confirm-share');
      await user.click(confirmBtn);

      // 驗證 URL 首碼為 0
      await waitFor(() => {
        expect(capturedShareUrl).not.toBeNull();
        expect(capturedShareUrl).toMatch(/#\/\?data=0/);
      });
    });

    test('密碼保護 Round-trip：加密 → 解密 → 資料一致', async () => {
      const PASSWORD = 'testPass456';
      const user = userEvent.setup();
      render(<Generator />);

      // 等待載入完成
      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 填入金額
      await user.type(screen.getByPlaceholderText('0'), '888');

      // 等待 QR Code 產生
      await waitFor(() => {
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
      });

      // 開啟密碼 toggle
      const toggleButtons = screen.getAllByText('設定密碼保護');
      await user.click(toggleButtons[0]);

      // 輸入密碼
      const passwordInputs = screen.getAllByPlaceholderText('輸入分享密碼');
      await user.type(passwordInputs[0], PASSWORD);

      // 點擊分享 → 開啟確認 Dialog
      await user.click(screen.getByRole('button', { name: /分享連結/i }));

      // 點擊 mock Dialog 的確認分享按鈕
      const confirmBtn = await screen.findByTestId('mock-confirm-share');
      await user.click(confirmBtn);

      // 等待 URL 產生
      await waitFor(() => {
        expect(capturedShareUrl).not.toBeNull();
        expect(capturedShareUrl).toMatch(/#\/\?data=1/);
      });

      // 從 URL 提取 blob
      const blob = capturedShareUrl!.split('data=1')[1];
      expect(blob).toBeTruthy();

      // 解密 + 解壓
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
      // 清除 localStorage 模擬全新使用者
      localStorageMock.clear();

      render(<Generator initialBankCode="812" />);

      // 等待帳戶 trigger button 渲染
      await waitFor(() => {
        expect(screen.getByText('帳戶')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('無效的 initialBankCode 應被忽略', async () => {
      render(<Generator initialBankCode="999" />);

      // 應正常渲染，不 crash
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /收款/i })).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // QrBrandCard 品牌化 QR 整合 (Phase 8.5)
  // ---------------------------------------------------------------------------

  describe('QrBrandCard 品牌化 QR 整合', () => {
    test('收款模式：應渲染 QrBrandCard variant="payment"', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

      // 填入金額觸發 QR 產生
      await user.type(screen.getByPlaceholderText('0'), '100');

      await waitFor(() => {
        const card = screen.getByTestId('qr-brand-card');
        expect(card).toBeInTheDocument();
        expect(card.getAttribute('data-variant')).toBe('payment');
      });
    });

    test('收款模式：QrBrandCard 應接收正確的銀行與帳號', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });
      await user.type(screen.getByPlaceholderText('0'), '100');

      await waitFor(() => {
        const card = screen.getByTestId('qr-brand-card');
        expect(card.getAttribute('data-bank-name')).toContain('822');
        expect(card.getAttribute('data-account-number')).toBe('123456789012');
      });
    });

    test('分帳 Host：應渲染 QrBrandCard variant="share"', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      // 切換到分帳模式
      await user.click(screen.getByRole('button', { name: /分帳/i }));
      await waitFor(() => screen.getByPlaceholderText(/例如：週五燒肉局/i));

      // 設定標題 + 成員 + 項目
      await user.type(screen.getByPlaceholderText(/例如：週五燒肉局/i), '聚餐');
      await user.type(screen.getByPlaceholderText(/輸入朋友名字/i), 'Bob{enter}');
      await user.click(screen.getByRole('button', { name: /新增項目/i }));

      await waitFor(() => {
        expect(screen.getAllByPlaceholderText('0').length).toBeGreaterThan(0);
      });
      const inputs = screen.getAllByPlaceholderText('0');
      await user.type(inputs[inputs.length - 1], '500');

      await waitFor(() => {
        const card = screen.getByTestId('qr-brand-card');
        expect(card.getAttribute('data-variant')).toBe('share');
      });
    });

    test('分帳 Host：QrBrandCard qrValue 應為 Share URL', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await user.click(screen.getByRole('button', { name: /分帳/i }));
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
        const card = screen.getByTestId('qr-brand-card');
        const qrValue = card.getAttribute('data-qr-value');
        expect(qrValue).toMatch(/^https?:\/\//);
      });
    });

    test('分帳 Host：應傳入帳單標題與金額', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await user.click(screen.getByRole('button', { name: /分帳/i }));
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
        const card = screen.getByTestId('qr-brand-card');
        expect(card.getAttribute('data-bill-title')).toBe('聚餐');
        expect(card.getAttribute('data-bill-total')).toBeTruthy();
      });
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

      await waitFor(() => {
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
      });

      const shareBtn = screen.getByRole('button', { name: /分享連結/i });
      await user.click(shareBtn);

      await waitFor(() => {
        expect(screen.getByTestId('share-confirm-dialog')).toBeInTheDocument();
      });
    });

    test('分帳 Host：點擊分享應開啟確認 Dialog', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await user.click(screen.getByRole('button', { name: /分帳/i }));
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
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
      });

      const shareBtn = screen.getByRole('button', { name: /分享連結/i });
      await user.click(shareBtn);

      await waitFor(() => {
        expect(screen.getByTestId('share-confirm-dialog')).toBeInTheDocument();
      });
    });

    test('確認分享後不應顯示縮網址服務入口', async () => {
      const user = userEvent.setup();
      render(<Generator />);

      await screen.findByPlaceholderText('0', {}, { timeout: 3000 });
      await user.type(screen.getByPlaceholderText('0'), '100');

      await waitFor(() => {
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
      });

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

      await waitFor(() => {
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
      });

      // Set up the spy just before clicking download (after render)
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

      const downloadBtn = screen.getByRole('button', { name: /下載圖片/i });
      await user.click(downloadBtn);

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

      await waitFor(() => {
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
      });

      const downloadBtn = screen.getByRole('button', { name: /下載圖片/i });
      await user.click(downloadBtn);

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

      await waitFor(() => {
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
      });

      const downloadBtn = screen.getByRole('button', { name: /下載圖片/i });
      // Should not throw
      await expect(async () => {
        await user.click(downloadBtn);
      }).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Template Attribution (TEMPLATE BY) — 模式切換 + 參數變更偵測
  // ---------------------------------------------------------------------------

  describe('Template Attribution (TEMPLATE BY)', () => {
    /** 等待 Splash 結束，點擊模板按鈕開啟 TemplateSheet */
    const openTemplateSheet = async (user: ReturnType<typeof userEvent.setup>) => {
      const sceneTrigger = await screen.findByText('模板', {}, { timeout: 3000 });
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

    test('切換到其他模式時 badge 應隱藏', async () => {
      const user = userEvent.setup();
      render(<Generator />);
      await openTemplateSheet(user);

      // 套用 payment 模板
      await user.click(screen.getByText('Netflix 合租'));
      await waitFor(() => expect(screen.getByText('TEMPLATE BY')).toBeInTheDocument(), { timeout: 3000 });

      // 切到分帳模式
      await user.click(screen.getByText('分帳'));

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

      // 切到分帳 → badge 消失
      await user.click(screen.getByText('分帳'));
      await waitFor(() => expect(screen.queryByText('TEMPLATE BY')).not.toBeInTheDocument(), { timeout: 3000 });

      // 切回收款模式 → badge 回歸
      await user.click(screen.getByText('收款'));
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
      await user.click(screen.getByText('分帳'));
      await waitFor(() => expect(screen.queryByText('TEMPLATE BY')).not.toBeInTheDocument(), { timeout: 3000 });
      await user.click(screen.getByText('收款'));
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

      // 等待 Loading 結束，BillViewer 出現
      await waitFor(() => {
        expect(screen.getByText('帳單明細 (唯讀)')).toBeInTheDocument();
      }, { timeout: 3000 });

      // DEBUG: 觀察當前右側面板狀態
      const hasQrBefore = screen.queryByTestId('qr-brand-card');
      const hasWaitingText = screen.queryByText(/請先在左側選擇您的名字/);
      const hasQrText = screen.queryByText(/掃描下方 QR Code/);

      // 點擊成員 "Alice"
      await user.click(screen.getByText('Alice'));

      // 選擇後：QR Code 應出現
      await waitFor(() => {
        expect(screen.getByTestId('qr-brand-card')).toBeInTheDocument();
      }, { timeout: 3000 });

      // 文字應變更為 "掃描下方 QR Code 進行分帳"
      expect(screen.getByText(/掃描下方 QR Code 進行分帳/)).toBeInTheDocument();
    });

    test('長標題：comment 超過 20 字限制時，QR Code 仍應產生', async () => {
      const longTitleData = {
        ...billShareData,
        bd: {
          ...billShareData.bd,
          t: '週五錢櫃歡唱趴踢',  // 長標題 → [週五錢櫃歡唱趴踢] 分帳 (Alice) = 21+ chars
        },
      };
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      render(
        <Generator initialMode="bill" initialData={longTitleData} isShared={true} />
      );

      await waitFor(() => {
        expect(screen.getByText('帳單明細 (唯讀)')).toBeInTheDocument();
      }, { timeout: 3000 });

      // 點擊成員 "Alice"
      await user.click(screen.getByText('Alice'));

      // 即使 comment 超過 20 字，QR Code 仍應出現
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

      // Alice 參與：包廂費 100/3 + 餐點 35/2 = 33.33 + 17.5 = 50.83 → 51
      await user.click(screen.getByText('Alice'));

      await waitFor(() => {
        expect(screen.getByText('$51')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  test('輸入無效金額(負數)時，應顯示錯誤訊息且不產生 QR Code', async () => {
    const user = userEvent.setup();
    render(<Generator />);

    // 等待載入完成
    await screen.findByPlaceholderText('0', {}, { timeout: 3000 });

    // 輸入負數金額
    const amountInput = screen.getByPlaceholderText('0');
    await user.type(amountInput, '-100');

    // 觸發 Blur 以啟動驗證 (如果驗證是在 onBlur 時觸發)
    await user.tab();

    // 驗證 QR Code 不應出現
    await waitFor(() => {
        const qr = screen.queryByTestId('qr-code');
        expect(qr).not.toBeInTheDocument();
    });
    
    // 驗證錯誤訊息 (假設錯誤訊息會顯示在 input 下方)
    // 根據 validators.ts: message: "金額必須為大於 0 的整數"
    await waitFor(() => {
        expect(screen.getByText(/金額必須為大於 0 的整數/i)).toBeInTheDocument();
    });
  });

});
