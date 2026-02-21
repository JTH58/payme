import { renderHook, act } from '@testing-library/react';
import { useAccounts } from '../use-accounts';

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

// Mock migrateAccountsIfNeeded
jest.mock('@/lib/migrate-accounts', () => ({
  ...jest.requireActual('@/lib/migrate-accounts'),
  migrateAccountsIfNeeded: jest.fn(),
}));

import { migrateAccountsIfNeeded } from '@/lib/migrate-accounts';

const mockMigrate = migrateAccountsIfNeeded as jest.MockedFunction<typeof migrateAccountsIfNeeded>;

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
  jest.useFakeTimers();
  uuidCounter = 0;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useAccounts', () => {
  it('should initialize with empty account when migration returns empty', () => {
    mockMigrate.mockReturnValue([]);

    const { result } = renderHook(() => useAccounts());

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].bankCode).toBe('');
    expect(result.current.accounts[0].isShared).toBe(true);
  });

  it('should load migrated accounts', () => {
    const migrated = [
      { id: 'a1', bankCode: '004', accountNumber: '1111111111', isShared: true },
      { id: 'a2', bankCode: '812', accountNumber: '2222222222', isShared: false },
    ];
    mockMigrate.mockReturnValue(migrated);

    const { result } = renderHook(() => useAccounts());

    expect(result.current.accounts).toEqual(migrated);
    expect(result.current.isLoaded).toBe(true);
  });

  it('should derive sharedAccounts correctly', () => {
    mockMigrate.mockReturnValue([
      { id: 'a1', bankCode: '004', accountNumber: '1111111111', isShared: true },
      { id: 'a2', bankCode: '812', accountNumber: '2222222222', isShared: false },
      { id: 'a3', bankCode: '013', accountNumber: '3333333333', isShared: true },
    ]);

    const { result } = renderHook(() => useAccounts());

    expect(result.current.sharedAccounts).toHaveLength(2);
    expect(result.current.sharedAccounts[0].bankCode).toBe('004');
    expect(result.current.sharedAccounts[1].bankCode).toBe('013');
  });

  it('should derive primaryAccount as first shared account', () => {
    mockMigrate.mockReturnValue([
      { id: 'a1', bankCode: '004', accountNumber: '1111111111', isShared: false },
      { id: 'a2', bankCode: '812', accountNumber: '2222222222', isShared: true },
    ]);

    const { result } = renderHook(() => useAccounts());

    expect(result.current.primaryAccount?.bankCode).toBe('812');
  });

  it('should return null primaryAccount when no shared accounts', () => {
    mockMigrate.mockReturnValue([
      { id: 'a1', bankCode: '004', accountNumber: '1111111111', isShared: false },
    ]);

    const { result } = renderHook(() => useAccounts());

    expect(result.current.primaryAccount).toBeNull();
  });

  it('should add a new account', () => {
    mockMigrate.mockReturnValue([
      { id: 'a1', bankCode: '004', accountNumber: '1111111111', isShared: true },
    ]);

    const { result } = renderHook(() => useAccounts());

    act(() => {
      result.current.addAccount();
    });

    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.accounts[1].bankCode).toBe('');
    expect(result.current.accounts[1].isShared).toBe(true);
  });

  it('should remove an account', () => {
    mockMigrate.mockReturnValue([
      { id: 'a1', bankCode: '004', accountNumber: '1111111111', isShared: true },
      { id: 'a2', bankCode: '812', accountNumber: '2222222222', isShared: true },
    ]);

    const { result } = renderHook(() => useAccounts());

    act(() => {
      result.current.removeAccount('a1');
    });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].id).toBe('a2');
  });

  it('should not remove the last account', () => {
    mockMigrate.mockReturnValue([
      { id: 'a1', bankCode: '004', accountNumber: '1111111111', isShared: true },
    ]);

    const { result } = renderHook(() => useAccounts());

    act(() => {
      result.current.removeAccount('a1');
    });

    expect(result.current.accounts).toHaveLength(1);
  });

  it('should update an account', () => {
    mockMigrate.mockReturnValue([
      { id: 'a1', bankCode: '004', accountNumber: '1111111111', isShared: true },
    ]);

    const { result } = renderHook(() => useAccounts());

    act(() => {
      result.current.updateAccount('a1', { bankCode: '812', accountNumber: '9999999999' });
    });

    expect(result.current.accounts[0].bankCode).toBe('812');
    expect(result.current.accounts[0].accountNumber).toBe('9999999999');
    expect(result.current.accounts[0].isShared).toBe(true); // unchanged
  });

  it('should toggle shared status', () => {
    mockMigrate.mockReturnValue([
      { id: 'a1', bankCode: '004', accountNumber: '1111111111', isShared: true },
    ]);

    const { result } = renderHook(() => useAccounts());

    act(() => {
      result.current.toggleShared('a1');
    });

    expect(result.current.accounts[0].isShared).toBe(false);

    act(() => {
      result.current.toggleShared('a1');
    });

    expect(result.current.accounts[0].isShared).toBe(true);
  });

  it('should debounce save to localStorage', () => {
    mockMigrate.mockReturnValue([
      { id: 'a1', bankCode: '004', accountNumber: '1111111111', isShared: true },
    ]);

    const { result } = renderHook(() => useAccounts());

    // Clear initial calls
    localStorageMock.setItem.mockClear();

    act(() => {
      result.current.updateAccount('a1', { bankCode: '812' });
    });

    // 應該還沒存（debounce 400ms）
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
      'payme_accounts',
      expect.any(String)
    );

    // 快進 400ms
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'payme_accounts',
      expect.stringContaining('"812"')
    );
  });
});
