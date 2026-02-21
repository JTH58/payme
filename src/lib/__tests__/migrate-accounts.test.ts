import { migrateAccountsIfNeeded, type AccountEntry } from '../migrate-accounts';

// Mock crypto.randomUUID
let uuidCounter = 0;
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => `uuid-${++uuidCounter}`,
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
  uuidCounter = 0;
});

describe('migrateAccountsIfNeeded', () => {
  it('should skip migration when payme_accounts already exists', () => {
    const existing: AccountEntry[] = [
      { id: 'existing-1', bankCode: '004', accountNumber: '1234567890', isShared: true },
    ];
    localStorageMock.setItem('payme_accounts', JSON.stringify(existing));

    const result = migrateAccountsIfNeeded();

    expect(result).toEqual(existing);
    // 不應觸發 setItem（除了初始設定）
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1); // 只有初始 setItem
  });

  it('should merge accounts from multiple mode keys with dedup', () => {
    const generalData = {
      bankCode: '004',
      accountNumber: '1111111111',
      accounts: [
        { id: 'g1', bankCode: '004', accountNumber: '1111111111', isShared: true },
        { id: 'g2', bankCode: '812', accountNumber: '2222222222', isShared: false },
      ],
    };
    const simpleData = {
      bankCode: '004',
      accountNumber: '1111111111',
      accounts: [
        { id: 's1', bankCode: '004', accountNumber: '1111111111', isShared: false }, // same as g1
        { id: 's2', bankCode: '013', accountNumber: '3333333333', isShared: true },
      ],
    };

    localStorageMock.setItem('payme_data_general', JSON.stringify(generalData));
    localStorageMock.setItem('payme_data_simple', JSON.stringify(simpleData));

    const result = migrateAccountsIfNeeded();

    // 004-1111111111 dedup 合一（isShared OR → true）
    // 812-2222222222 保留
    // 013-3333333333 保留
    expect(result).toHaveLength(3);

    const acc004 = result.find(a => a.bankCode === '004');
    expect(acc004?.isShared).toBe(true); // OR of true + false = true

    const acc812 = result.find(a => a.bankCode === '812');
    expect(acc812?.isShared).toBe(false);

    const acc013 = result.find(a => a.bankCode === '013');
    expect(acc013?.isShared).toBe(true);
  });

  it('should fallback to top-level bankCode/accountNumber when no accounts[]', () => {
    const data = { bankCode: '822', accountNumber: '9999999999', amount: '100' };
    localStorageMock.setItem('payme_data_general', JSON.stringify(data));

    const result = migrateAccountsIfNeeded();

    expect(result).toHaveLength(1);
    expect(result[0].bankCode).toBe('822');
    expect(result[0].accountNumber).toBe('9999999999');
    expect(result[0].isShared).toBe(true);
  });

  it('should dedup between accounts[] and top-level fallback from different modes', () => {
    // general 有 accounts[]
    localStorageMock.setItem('payme_data_general', JSON.stringify({
      bankCode: '004',
      accountNumber: '1111111111',
      accounts: [
        { id: 'a1', bankCode: '004', accountNumber: '1111111111', isShared: true },
      ],
    }));
    // simple 只有 top-level（無 accounts[]）
    localStorageMock.setItem('payme_data_simple', JSON.stringify({
      bankCode: '004',
      accountNumber: '1111111111',
    }));

    const result = migrateAccountsIfNeeded();

    // 應 dedup 為一筆
    expect(result).toHaveLength(1);
    expect(result[0].bankCode).toBe('004');
  });

  it('should clear accounts field from old mode keys after migration', () => {
    const data = {
      bankCode: '004',
      accountNumber: '1111111111',
      amount: '500',
      accounts: [
        { id: 'a1', bankCode: '004', accountNumber: '1111111111', isShared: true },
      ],
    };
    localStorageMock.setItem('payme_data_general', JSON.stringify(data));

    migrateAccountsIfNeeded();

    // 讀取更新後的 general data，應無 accounts 欄位
    // 過濾掉初始 setItem 和 payme_accounts 的寫入，找到遷移後的 general key 寫入
    const generalCalls = localStorageMock.setItem.mock.calls.filter(
      (call: string[]) => call[0] === 'payme_data_general'
    );
    // 第一次是 beforeEach 初始設定，第二次是遷移後清除 accounts
    const updatedRaw = generalCalls[generalCalls.length - 1];
    expect(updatedRaw).toBeDefined();
    const updated = JSON.parse(updatedRaw[1]);
    expect(updated.accounts).toBeUndefined();
    expect(updated.amount).toBe('500'); // 其他欄位保留
  });

  it('should return empty array and write [] when no data exists anywhere', () => {
    const result = migrateAccountsIfNeeded();
    expect(result).toEqual([]);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('payme_accounts', '[]');
  });

  it('should skip entries with missing bankCode or accountNumber', () => {
    localStorageMock.setItem('payme_data_general', JSON.stringify({
      accounts: [
        { id: 'a1', bankCode: '004', accountNumber: '', isShared: true },
        { id: 'a2', bankCode: '', accountNumber: '1234567890', isShared: true },
        { id: 'a3', bankCode: '812', accountNumber: '5555555555', isShared: true },
      ],
    }));

    const result = migrateAccountsIfNeeded();
    expect(result).toHaveLength(1);
    expect(result[0].bankCode).toBe('812');
  });

  it('should handle corrupted JSON gracefully', () => {
    localStorageMock.setItem('payme_data_general', 'not-valid-json');
    localStorageMock.setItem('payme_data_simple', JSON.stringify({
      bankCode: '004',
      accountNumber: '1234567890',
    }));

    const result = migrateAccountsIfNeeded();
    expect(result).toHaveLength(1);
    expect(result[0].bankCode).toBe('004');
  });
});
