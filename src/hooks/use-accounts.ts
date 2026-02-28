import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { safeGetItem, safeSetItem, generateId } from '@/lib/safe-storage';
import { migrateAccountsIfNeeded, type AccountEntry } from '@/lib/migrate-accounts';
import { STORAGE_KEY } from '@/config/storage-keys';

export type { AccountEntry } from '@/lib/migrate-accounts';

export interface UseAccountsReturn {
  accounts: AccountEntry[];
  sharedAccounts: AccountEntry[];
  primaryAccount: AccountEntry | null;
  addAccount: (init?: Partial<Pick<AccountEntry, 'bankCode' | 'accountNumber'>>) => void;
  removeAccount: (id: string) => void;
  updateAccount: (id: string, patch: Partial<AccountEntry>) => void;
  toggleShared: (id: string) => void;
  isLoaded: boolean;
}

export function useAccounts(): UseAccountsReturn {
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Mount 時遷移 + 載入
  useEffect(() => {
    const migrated = migrateAccountsIfNeeded();

    if (migrated.length === 0) {
      // 全新使用者 → 初始化一筆空白帳戶
      const initial: AccountEntry[] = [{
        id: generateId(),
        bankCode: '',
        accountNumber: '',
        isShared: true,
      }];
      setAccounts(initial);
      safeSetItem(STORAGE_KEY.accounts, JSON.stringify(initial));
    } else {
      setAccounts(migrated);
    }

    setIsLoaded(true);
  }, []);

  // Debounce 自動儲存
  const isFirstSave = useRef(true);
  useEffect(() => {
    if (!isLoaded) return;
    if (isFirstSave.current) {
      isFirstSave.current = false;
      return;
    }

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      safeSetItem(STORAGE_KEY.accounts, JSON.stringify(accounts));
    }, 400);

    return () => clearTimeout(saveTimerRef.current);
  }, [accounts, isLoaded]);

  const addAccount = useCallback((init?: Partial<Pick<AccountEntry, 'bankCode' | 'accountNumber'>>) => {
    // Guard: onClick handlers pass event as first arg — ignore non-plain-objects
    const safeInit = init && typeof init === 'object' && !('nativeEvent' in init) ? init : undefined;
    setAccounts(prev => [...prev, {
      id: generateId(),
      bankCode: '',
      accountNumber: '',
      isShared: true,
      ...safeInit,
    }]);
  }, []);

  const removeAccount = useCallback((id: string) => {
    setAccounts(prev => {
      if (prev.length <= 1) return prev; // 至少保留一筆
      return prev.filter(acc => acc.id !== id);
    });
  }, []);

  const updateAccount = useCallback((id: string, patch: Partial<AccountEntry>) => {
    setAccounts(prev => prev.map(acc =>
      acc.id === id ? { ...acc, ...patch } : acc
    ));
  }, []);

  const toggleShared = useCallback((id: string) => {
    setAccounts(prev => prev.map(acc =>
      acc.id === id ? { ...acc, isShared: !acc.isShared } : acc
    ));
  }, []);

  const sharedAccounts = useMemo(
    () => accounts.filter(acc => acc.isShared),
    [accounts]
  );

  const primaryAccount = useMemo(
    () => sharedAccounts.length > 0 ? sharedAccounts[0] : null,
    [sharedAccounts]
  );

  return {
    accounts,
    sharedAccounts,
    primaryAccount,
    addAccount,
    removeAccount,
    updateAccount,
    toggleShared,
    isLoaded,
  };
}
