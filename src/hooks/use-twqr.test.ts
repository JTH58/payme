import { renderHook, act } from '@testing-library/react';
import LZString from 'lz-string';
import { useTwqr, SPLASH_DURATION_MS, SKELETON_DURATION_MS } from './use-twqr';
import type { CompressedData } from '@/types/bill';
import type { AppMode } from '@/config/routes';

// Mock next/navigation
const mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

describe('useTwqr Hook', () => {
  
  beforeEach(() => {
    // Reset search params
    const keys = Array.from(mockSearchParams.keys());
    for (const key of keys) {
      mockSearchParams.delete(key);
    }
    // Clear localStorage
    window.localStorage.clear();
    // Reset mocks
    jest.clearAllMocks();
    
    // Enable Fake Timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('模式還原與儲存 (Mode Restore & Persistence)', () => {
    test('預設應為 payment 模式', () => {
      const { result } = renderHook(() => useTwqr());
      
      // Handle initial load timeout
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.mode).toBe('pay');
    });

    test('應能從 LocalStorage 還原上次的模式 (bill)', () => {
      window.localStorage.setItem('payme_last_mode', 'bill');
      
      const { result } = renderHook(() => useTwqr());
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(result.current.mode).toBe('bill');
    });

    test('切換模式應自動寫入 LocalStorage', () => {
      const { result } = renderHook(() => useTwqr());
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(window.localStorage.getItem('payme_last_mode')).toBe('pay'); // 初始化時寫入

      act(() => {
        result.current.setMode('bill');
        // Mode switch also has a timeout for isLoading
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.mode).toBe('bill');
      expect(window.localStorage.getItem('payme_last_mode')).toBe('bill');
    });

    test('若為分享連結 (isSharedLink)，應優先使用連結中的模式，不讀取 LocalStorage', () => {
      // 設定 LocalStorage 為 payment
      window.localStorage.setItem('payme_last_mode', 'pay');

      // Phase 3: 透過 props 傳入分享連結資料 (由 page.tsx → useUrlParser 解析後傳入)
      const shareData: CompressedData = { mo: 'bill', b: '822', a: '123', m: '', c: '' };

      const { result } = renderHook(() => useTwqr({
        initialMode: 'bill',
        initialData: shareData,
        isShared: true,
      }));

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // 應該要是 bill (來自 URL props)，而非 payment (來自 Storage)
      expect(result.current.mode).toBe('bill');
      expect(result.current.isSharedLink).toBe(true);
    });
  });

  describe('分享連結行為 (Shared Link Behavior)', () => {
     test('若為分帳模式 (bill) 的分享連結，初始不應產生 QR Code (需等待選擇使用者)', () => {
      const shareData: CompressedData = { mo: 'bill', b: '822', a: '123', m: '', c: '' };

      const { result } = renderHook(() => useTwqr({
        initialMode: 'bill',
        initialData: shareData,
        isShared: true,
      }));

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.mode).toBe('bill');
      expect(result.current.isSharedLink).toBe(true);
      expect(result.current.qrString).toBe('');
    });

    test('若為收款模式 (payment) 的分享連結，初始應自動產生 QR Code', () => {
      const shareData: CompressedData = { mo: 'pay', b: '822', a: '123', m: '100', c: '' };

      const { result } = renderHook(() => useTwqr({
        initialMode: 'pay',
        initialData: shareData,
        isShared: true,
      }));

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.mode).toBe('pay');
      expect(result.current.qrString).not.toBe('');
      expect(result.current.qrString).toContain('TWQRP');
    });
  });

  describe('分享連結延遲載入 (Shared Link Deferred Loading)', () => {
    test('initialData 從 null 變為有效資料時，應正確更新 billData', () => {
      // 模擬真實場景：useUrlParser 首次 render 回傳 null，第二次才有資料
      const { result, rerender } = renderHook(
        (props: { initialData: CompressedData | null; isShared: boolean; initialMode: AppMode | null }) =>
          useTwqr(props),
        { initialProps: { initialData: null, isShared: false, initialMode: null } }
      );

      act(() => { jest.advanceTimersByTime(1000); });

      // T0: 初始狀態 — 沒有 billData
      expect(result.current.billData).toBeUndefined();

      // T1: useUrlParser 解析完成，props 更新
      const shareData: CompressedData = {
        mo: 'bill', b: '822', a: '1234567890', m: '0', c: '',
        bd: { t: '週五聚餐', m: ['Alice', 'Bob'], i: [{ n: '披薩', p: 300, o: [0, 1] }], s: false },
      };

      rerender({ initialData: shareData, isShared: true, initialMode: 'bill' });

      act(() => { jest.advanceTimersByTime(1000); });

      // billData 應該被同步
      expect(result.current.billData).toEqual(shareData.bd);
      expect(result.current.mode).toBe('bill');
      expect(result.current.isSharedLink).toBe(true);
    });

    test('initialData 從 null 變為有效資料時，應正確更新 form values', () => {
      const { result, rerender } = renderHook(
        (props: { initialData: CompressedData | null; isShared: boolean; initialMode: AppMode | null }) =>
          useTwqr(props),
        { initialProps: { initialData: null, isShared: false, initialMode: null } }
      );

      act(() => { jest.advanceTimersByTime(1000); });

      // T1: props 更新
      const shareData: CompressedData = { mo: 'pay', b: '004', a: '9876543210', m: '500', c: '午餐' };

      rerender({ initialData: shareData, isShared: true, initialMode: 'pay' });

      act(() => { jest.advanceTimersByTime(1000); });

      expect(result.current.form.getValues('bankCode')).toBe('004');
      expect(result.current.form.getValues('accountNumber')).toBe('9876543210');
      expect(result.current.form.getValues('amount')).toBe('500');
    });

    test('initialData 從 null 變為有效資料時，應正確更新 templateId', () => {
      const { result, rerender } = renderHook(
        (props: { initialData: CompressedData | null; isShared: boolean; initialMode: AppMode | null }) =>
          useTwqr(props),
        { initialProps: { initialData: null, isShared: false, initialMode: null } }
      );

      act(() => { jest.advanceTimersByTime(1000); });

      const shareData: CompressedData = {
        mo: 'bill', b: '822', a: '123', m: '0', c: '', tid: 'netflix_red',
        bd: { t: 'Test', m: ['A'], i: [{ n: 'X', p: 100, o: [0] }], s: false },
      };

      rerender({ initialData: shareData, isShared: true, initialMode: 'bill' });

      act(() => { jest.advanceTimersByTime(1000); });

      expect(result.current.templateId).toBe('netflix_red');
    });
  });

  describe('自動儲存 Debounce (Auto-Save Debounce)', () => {
    test('連續輸入只觸發一次 localStorage 寫入', () => {
      const { result } = renderHook(() => useTwqr());

      // Pass initial load
      act(() => { jest.advanceTimersByTime(1000); });

      // Switch mode to trigger auto-save effect subscription (isFirstRender guard)
      act(() => {
        result.current.setMode('bill');
        jest.advanceTimersByTime(1000);
      });

      // Switch back to payment to test auto-save
      act(() => {
        result.current.setMode('pay');
        jest.advanceTimersByTime(1000);
      });

      const setSpy = jest.spyOn(Storage.prototype, 'setItem');
      setSpy.mockClear();

      // Simulate rapid form changes
      act(() => {
        result.current.form.setValue('amount', '100');
      });
      act(() => {
        result.current.form.setValue('amount', '200');
      });
      act(() => {
        result.current.form.setValue('amount', '300');
      });

      // Before debounce timeout, should NOT have written mode data
      // 預設 personal 模式現在寫入 payme_data_personal
      const writesBefore = setSpy.mock.calls.filter(
        c => c[0] === 'payme_data_personal'
      );
      expect(writesBefore.length).toBe(0);

      // After debounce timeout
      act(() => { jest.advanceTimersByTime(500); });

      const writesAfter = setSpy.mock.calls.filter(
        c => c[0] === 'payme_data_personal'
      );
      expect(writesAfter.length).toBe(1);

      setSpy.mockRestore();
    });
  });

  describe('模式資料隔離 (Mode Data Isolation)', () => {
    test('personal 與 split 各自讀取獨立 storage key', () => {
      // 設定兩個不同的 storage：personal 專用 key 和 split 使用的 payment key
      window.localStorage.setItem('payme_data_personal', JSON.stringify({
        bankCode: '822', accountNumber: '123456789012', amount: '500', comment: '個人午餐',
      }));
      window.localStorage.setItem('payme_data_payment', JSON.stringify({
        bankCode: '822', accountNumber: '123456789012', amount: '200', comment: '均分晚餐',
      }));

      // 以 personal 模式啟動
      const { result } = renderHook(() => useTwqr());
      act(() => { jest.advanceTimersByTime(1000); });

      // personal 應讀取 payme_data_personal 的資料
      expect(result.current.subMode).toBe('personal');
      expect(result.current.form.getValues('amount')).toBe('500');
      expect(result.current.form.getValues('comment')).toBe('個人午餐');

      // 切到 split → 應讀取 payme_data_payment
      act(() => {
        result.current.setSubMode('split');
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.subMode).toBe('split');
      expect(result.current.form.getValues('amount')).toBe('200');
      expect(result.current.form.getValues('comment')).toBe('均分晚餐');
    });

    test('split → personal：personal 無已存資料時 amount/comment 應為空', () => {
      // 只設定 split (payment) 的資料，不設 personal
      window.localStorage.setItem('payme_data_payment', JSON.stringify({
        bankCode: '822', accountNumber: '123456789012', amount: '200', comment: '均分',
      }));
      window.localStorage.setItem('payme_last_sub_mode', 'split');

      const { result } = renderHook(() => useTwqr());
      act(() => { jest.advanceTimersByTime(1000); });

      expect(result.current.subMode).toBe('split');
      expect(result.current.form.getValues('amount')).toBe('200');

      // 切到 personal → personal 沒有自己的存檔，應為空
      act(() => {
        result.current.setSubMode('personal');
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.subMode).toBe('personal');
      expect(result.current.form.getValues('amount')).toBe('');
      expect(result.current.form.getValues('comment')).toBe('');
    });

    test('personal → itemized → personal：round-trip 應保留 personal 資料', () => {
      // 預設 personal 存檔
      window.localStorage.setItem('payme_data_personal', JSON.stringify({
        bankCode: '822', accountNumber: '123456789012', amount: '300', comment: '咖啡',
      }));

      const { result } = renderHook(() => useTwqr());
      act(() => { jest.advanceTimersByTime(1000); });

      expect(result.current.subMode).toBe('personal');
      expect(result.current.form.getValues('amount')).toBe('300');

      // 切到 itemized
      act(() => {
        result.current.setSubMode('itemized');
        jest.advanceTimersByTime(1000);
      });

      // 切回 personal
      act(() => {
        result.current.setSubMode('personal');
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.subMode).toBe('personal');
      expect(result.current.form.getValues('amount')).toBe('300');
      expect(result.current.form.getValues('comment')).toBe('咖啡');
    });

    test('bank values 跨模式保持一致（fallback path 保留 bank）', () => {
      // 只有 personal 有完整資料，split/itemized 無存檔
      window.localStorage.setItem('payme_data_personal', JSON.stringify({
        bankCode: '004', accountNumber: '9876543210', amount: '100', comment: '',
      }));

      const { result } = renderHook(() => useTwqr());
      act(() => { jest.advanceTimersByTime(1000); });

      expect(result.current.form.getValues('bankCode')).toBe('004');
      expect(result.current.form.getValues('accountNumber')).toBe('9876543210');

      // 切到 split（無存檔 → fallback path 保留 bank 值）
      act(() => {
        result.current.setSubMode('split');
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.form.getValues('bankCode')).toBe('004');
      expect(result.current.form.getValues('accountNumber')).toBe('9876543210');

      // 切到 itemized（無存檔 → fallback path 保留 bank 值）
      act(() => {
        result.current.setSubMode('itemized');
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.form.getValues('bankCode')).toBe('004');
      expect(result.current.form.getValues('accountNumber')).toBe('9876543210');
    });

    test('bank values 跨模式保持一致（savedForm path 也保留 bank）', () => {
      // personal 有完整資料，split 有舊存檔但 bank 為空
      window.localStorage.setItem('payme_data_personal', JSON.stringify({
        bankCode: '004', accountNumber: '9876543210', amount: '100', comment: '',
      }));
      window.localStorage.setItem('payme_data_payment', JSON.stringify({
        bankCode: '', accountNumber: '', amount: '200', comment: '均分',
      }));

      const { result } = renderHook(() => useTwqr());
      act(() => { jest.advanceTimersByTime(1000); });

      expect(result.current.form.getValues('bankCode')).toBe('004');

      // 切到 split（有存檔但 bank 為空 → 應保留當前 bank，只還原 amount/comment）
      act(() => {
        result.current.setSubMode('split');
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.form.getValues('bankCode')).toBe('004');
      expect(result.current.form.getValues('accountNumber')).toBe('9876543210');
      expect(result.current.form.getValues('amount')).toBe('200');
      expect(result.current.form.getValues('comment')).toBe('均分');
    });

    test('向後相容遷移：舊 payme_data_payment → personal fallback', () => {
      // 舊格式：只有 payme_data_payment，沒有 payme_data_personal
      window.localStorage.setItem('payme_data_payment', JSON.stringify({
        bankCode: '822', accountNumber: '123456789012', amount: '999', comment: '舊資料',
      }));
      window.localStorage.setItem('payme_last_sub_mode', 'personal');

      const { result } = renderHook(() => useTwqr());
      act(() => { jest.advanceTimersByTime(1000); });

      expect(result.current.subMode).toBe('personal');
      // 應從 payme_data_payment 讀取作為 fallback
      expect(result.current.form.getValues('amount')).toBe('999');
      expect(result.current.form.getValues('comment')).toBe('舊資料');
    });
  });

  describe('localStorage 安全 (Safe Storage)', () => {
    test('localStorage 拋錯時 hook 不應崩潰', () => {
      const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('SecurityError');
      });

      expect(() => {
        const { result } = renderHook(() => useTwqr());
        act(() => { jest.advanceTimersByTime(1000); });
        expect(result.current.mode).toBe('pay');
      }).not.toThrow();

      spy.mockRestore();
    });

    test('localStorage setItem 拋錯時切換模式不應崩潰', () => {
      const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      expect(() => {
        const { result } = renderHook(() => useTwqr());
        act(() => { jest.advanceTimersByTime(1000); });
        act(() => {
          result.current.setMode('bill');
          jest.advanceTimersByTime(1000);
        });
        expect(result.current.mode).toBe('bill');
      }).not.toThrow();

      spy.mockRestore();
    });
  });

  describe('資料壓縮與解壓縮 (Compression & Decompression)', () => {
    test('應能正確解析乾淨的壓縮資料', () => {
        const originalData = {
          b: '822',
          a: '123456789012',
          m: '500',
          c: 'Lunch',
          mo: 'pay'
        };
        const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(originalData));
        
        mockSearchParams.set('data', compressed);
    
        const rawData = mockSearchParams.get('data');
        const extracted = rawData ? rawData.match(/^[A-Za-z0-9+\-$]+/)?.[0] : null;
        expect(extracted).toBe(compressed);
        
        const decompressed = JSON.parse(LZString.decompressFromEncodedURIComponent(extracted!) || '{}');
        expect(decompressed).toEqual(originalData);
      });
    
      test('應能正確解析帶有髒汙文字(無空白)的壓縮資料', () => {
        const originalData = {
          b: '822',
          a: '123456789012',
          mo: 'bill',
          bd: { t: 'Test', m: ['A'], i: [], s: false }
        };
        const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(originalData));
        
        const dirtyData = `${compressed}銀行：822`;
        mockSearchParams.set('data', dirtyData);
    
        const rawData = mockSearchParams.get('data');
        const extracted = rawData ? rawData.match(/^[A-Za-z0-9+\-$]+/)?.[0] : null;
        
        expect(extracted).toBe(compressed);
        
        const decompressed = JSON.parse(LZString.decompressFromEncodedURIComponent(extracted!) || '{}');
        expect(decompressed).toEqual(originalData);
      });
    
      test('應能正確解析帶有髒汙文字(有空白)的壓縮資料', () => {
        const originalData = { m: '100' };
        const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(originalData));
        
        const dirtyData = `${compressed} 這是說明文字`;
        mockSearchParams.set('data', dirtyData);
    
        const rawData = mockSearchParams.get('data');
        // 注意：原本的 regex 不允許空白，所以會停在空白前
        const extracted = rawData ? rawData.match(/^[A-Za-z0-9 \-$]+/)?.[0] : null;
        
        // 修正後的 Hook 邏輯允許 match 空白，但這邊只是測試 regex
        expect(extracted).toContain(compressed.substring(0, 10));
      });
  });

  describe('載入時序 (Loading Transitions)', () => {
    test('初始狀態為 isInitialLoad=true, isLoading=true', () => {
      const { result } = renderHook(() => useTwqr());
      expect(result.current.isInitialLoad).toBe(true);
      expect(result.current.isLoading).toBe(true);
    });

    test(`isLoading 在 ${SKELETON_DURATION_MS}ms 後變為 false`, () => {
      const { result } = renderHook(() => useTwqr());

      act(() => { jest.advanceTimersByTime(SKELETON_DURATION_MS + 10); });

      expect(result.current.isLoading).toBe(false);
    });

    test(`isInitialLoad 在 ${SPLASH_DURATION_MS}ms 後變為 false`, () => {
      const { result } = renderHook(() => useTwqr());

      act(() => { jest.advanceTimersByTime(SPLASH_DURATION_MS + 10); });

      expect(result.current.isInitialLoad).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    test('分享連結應跳過 splash 直接進入 ready', () => {
      const shareData: CompressedData = { mo: 'pay', b: '822', a: '123', m: '100', c: '' };
      const { result } = renderHook(() => useTwqr({
        initialMode: 'pay',
        initialData: shareData,
        isShared: true,
      }));

      act(() => { jest.advanceTimersByTime(10); });

      expect(result.current.isInitialLoad).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    test('切換模式時 isLoading 不應重新觸發（表單保持掛載）', () => {
      const { result } = renderHook(() => useTwqr());

      act(() => { jest.advanceTimersByTime(SPLASH_DURATION_MS + SKELETON_DURATION_MS + 10); });
      expect(result.current.isLoading).toBe(false);

      // Switch mode — isLoading 不再觸發，表單透過動畫展開/收合
      act(() => { result.current.setMode('bill'); });
      expect(result.current.isLoading).toBe(false);
    });
  });
});