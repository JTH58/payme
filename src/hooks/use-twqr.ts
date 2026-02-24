import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { twqrFormSchema, type TwqrFormValues } from '@/modules/core/utils/validators';
import { createTwqrString } from '@/modules/twqr/core/builder';
import { BillData, CompressedData } from '@/types/bill';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/safe-storage';
import { AppMode } from '@/config/routes';
import { STORAGE_KEY } from '@/config/storage-keys';
import { FormSubMode, subModeToAppMode, inferSubMode } from '@/config/form-modes';

/** 時序常數 */
export const SPLASH_DURATION_MS = 600;
export const SKELETON_DURATION_MS = 300;

/** subMode → localStorage form data key */
const SUBMODE_FORM_KEYS: Record<FormSubMode, string> = {
  personal: STORAGE_KEY.personal,
  split: STORAGE_KEY.payment,     // split 繼續用 payme_data_payment
  itemized: STORAGE_KEY.bill,
};

/** 非 form 的輔助 key */
const EXTRA_KEYS = {
  billData: STORAGE_KEY.billData,
  lastMode: STORAGE_KEY.lastMode,
};

interface UseTwqrOptions {
  initialMode?: AppMode | null;
  initialData?: CompressedData | null;
  isShared?: boolean;
}

export function useTwqr({ initialMode: propMode, initialData, isShared = false }: UseTwqrOptions = {}) {
  const [qrString, setQrString] = useState<string>('');

  const decompressedValues: Partial<CompressedData> = initialData || {};

  const computedInitialMode = (propMode as AppMode) || (decompressedValues.mo as AppMode) || 'pay';

  // 推導初始 subMode
  const computedInitialSubMode = inferSubMode(
    computedInitialMode,
    !!decompressedValues.sd
  );

  const [subMode, setSubModeState] = useState<FormSubMode>(computedInitialSubMode);

  // mode 由 subMode 衍生
  const mode: AppMode = subModeToAppMode(subMode);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const [billData, setBillData] = useState<BillData | undefined>(decompressedValues.bd);
  const [templateId, setTemplateId] = useState<string | undefined>(decompressedValues.tid);

  const form = useForm<TwqrFormValues>({
    resolver: zodResolver(twqrFormSchema),
    defaultValues: {
      bankCode: decompressedValues.b || '',
      accountNumber: decompressedValues.a || '',
      amount: decompressedValues.m || '',
      comment: decompressedValues.c || '',
    },
    mode: 'onChange',
  });

  const isFirstRender = useRef(true);
  const hasInitialLoad = useRef(false);

  // 0. 還原上次使用的子模式
  useEffect(() => {
    if (isShared) {
      setIsInitialLoad(false);
      if (computedInitialSubMode) {
        setSubModeState(computedInitialSubMode);
      }
      return;
    }

    // 優先讀取 lastSubMode，若無則向後相容讀取 lastMode
    const lastSubMode = safeGetItem(STORAGE_KEY.lastSubMode) as FormSubMode | null;
    if (lastSubMode && ['personal', 'split', 'itemized'].includes(lastSubMode)) {
      if (lastSubMode !== subMode) {
        setSubModeState(lastSubMode);
      }
    } else {
      // 向後相容：從舊的 lastMode 推導
      const lastMode = safeGetItem(EXTRA_KEYS.lastMode) as AppMode;
      if (lastMode && ['pay', 'bill'].includes(lastMode)) {
        const inferred = inferSubMode(lastMode);
        if (inferred !== subMode) {
          setSubModeState(inferred);
        }
      }
    }

    const timer = setTimeout(() => setIsInitialLoad(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, [isShared]);

  // 0.5 分享連結延遲載入
  useEffect(() => {
    if (!isShared || !initialData) return;

    if (initialData.bd) setBillData(initialData.bd);
    if (initialData.tid !== undefined) setTemplateId(initialData.tid);

    form.reset({
      bankCode: initialData.b || '',
      accountNumber: initialData.a || '',
      amount: initialData.m || '',
      comment: initialData.c || '',
    });
  }, [isShared, initialData, form]);

  // 1. 初始化與模式切換邏輯
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (isShared) {
      timers.push(setTimeout(() => {
        form.trigger();
        if (mode !== 'bill') {
          generateQr(form.getValues());
        }
        setIsLoading(false);
      }, 0));
      return () => timers.forEach(clearTimeout);
    }

    setQrString('');
    // 同時保存 subMode 和 mode（向後相容）
    safeSetItem(STORAGE_KEY.lastSubMode, subMode);
    safeSetItem(EXTRA_KEYS.lastMode, mode);

    // 使用 subMode 對應的 storage key
    let savedForm = safeGetItem(SUBMODE_FORM_KEYS[subMode]);

    // Personal mode fallback：初次載入時，若 payme_data_personal 不存在，嘗試讀取 payme_data_payment（向後相容遷移）
    // 限定初次載入，避免切換模式時 split 的資料污染 personal
    const isInitialMount = !hasInitialLoad.current;
    hasInitialLoad.current = true;
    if (!savedForm && subMode === 'personal' && isInitialMount) {
      savedForm = safeGetItem(STORAGE_KEY.payment);
    }

    const savedBillData = mode === 'bill' ? safeGetItem(EXTRA_KEYS.billData) : null;

    // 銀行帳戶由 useAccounts 統一管理，模式切換時保留當前值
    // 僅初次載入時從 localStorage 還原（尚無 useAccounts 資料）
    const currentBank = form.getValues('bankCode') || '';
    const currentAccount = form.getValues('accountNumber') || '';

    if (savedForm) {
      try {
        const parsedForm = JSON.parse(savedForm);
        // 移除舊的 accounts 欄位（已遷移到 payme_accounts）
        delete parsedForm.accounts;

        const bankCode = isInitialMount ? (parsedForm.bankCode || '') : currentBank;
        const accountNumber = isInitialMount ? (parsedForm.accountNumber || '') : currentAccount;

        form.reset({
          bankCode,
          accountNumber,
          amount: parsedForm.amount || '',
          comment: parsedForm.comment || '',
        });

        const mergedForm = { ...parsedForm, bankCode, accountNumber };
        const validation = twqrFormSchema.safeParse(mergedForm);

        timers.push(setTimeout(() => {
           form.trigger();
           if (validation.success) {
             generateQr(mergedForm);
           }
        }, 0));
      } catch { /* localStorage 讀取失敗，使用預設值 */ }
    } else {
      // 該模式沒有紀錄 → 只設定 amount/comment 為空
      // bankCode/accountNumber 由 useAccounts.primaryAccount 驅動
      form.reset({
        bankCode: currentBank,
        accountNumber: currentAccount,
        amount: '',
        comment: ''
      });

      // 觸發驗證，若帳號有效則生成 QR
      timers.push(setTimeout(() => {
        form.trigger();
        if (currentBank && currentAccount) {
          generateQr({ bankCode: currentBank, accountNumber: currentAccount, amount: '', comment: '' });
        }
      }, 0));
    }

    if (mode === 'bill' && savedBillData && !templateId) {
      try {
        setBillData(JSON.parse(savedBillData));
      } catch { /* localStorage 讀取失敗，使用預設值 */ }
    }

    timers.push(setTimeout(() => setIsLoading(false), SKELETON_DURATION_MS));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- templateId 故意省略：加入會導致模板套用時從 localStorage 還原資料覆蓋模板值
  }, [subMode, isShared, form]);

  // 2. 自動儲存邏輯（不含 accounts）
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isShared) return;
    if (isFirstRender.current) { isFirstRender.current = false; return; }

    const subscription = form.watch((value) => {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        // 只存 bankCode, accountNumber, amount, comment
        const { bankCode, accountNumber, amount, comment } = value;
        safeSetItem(SUBMODE_FORM_KEYS[subMode], JSON.stringify({ bankCode, accountNumber, amount, comment }));
      }, 400);
    });

    return () => {
      clearTimeout(saveTimerRef.current);
      subscription.unsubscribe();
    };
  }, [subMode, isShared, form]);

  // 3. QR Code 自動生成邏輯
  // 使用同步 Zod 驗證取代 form.formState.isValid，
  // 避免 async validation 尚未完成時 watch callback 誤判為無效
  useEffect(() => {
    const subscription = form.watch((value) => {
      const result = twqrFormSchema.safeParse(value);
      if (result.success) {
        generateQr(result.data);
      } else {
        setQrString('');
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // 4. BillData 專屬儲存
  useEffect(() => {
    if (isShared) return;
    if (mode === 'bill' && billData) {
      safeSetItem(EXTRA_KEYS.billData, JSON.stringify(billData));
    }
  }, [billData, mode, isShared]);

  const generateQr = (data: TwqrFormValues) => {
    try {
      const result = createTwqrString({
        bankCode: data.bankCode,
        accountNumber: data.accountNumber,
        amount: data.amount,
        comment: data.comment,
      });
      setQrString(result);
    } catch (e) {
      console.error("生成 QR Code 失敗", e);
      setQrString('');
    }
  };

  const onSubmit = (data: TwqrFormValues) => {
    generateQr(data);
  };

  const reset = () => {
    form.reset({
      bankCode: '',
      accountNumber: '',
      amount: '',
      comment: '',
    });
    setQrString('');
    if (!isShared) {
      safeRemoveItem(SUBMODE_FORM_KEYS[subMode]);
      if (mode === 'bill') safeRemoveItem(EXTRA_KEYS.billData);
    }
  };

  const switchSubMode = (newSubMode: FormSubMode) => {
    if (newSubMode === subMode) return;
    // 不再 setIsLoading(true) — 表單保持掛載，Section 透過動畫展開/收合
    setSubModeState(newSubMode);
  };

  // 向後相容：保留 setMode，內部轉為 subMode
  const switchMode = (newMode: AppMode) => {
    const newSubMode = inferSubMode(newMode);
    switchSubMode(newSubMode);
  };

  return {
    form,
    qrString,
    generate: form.handleSubmit(onSubmit),
    reset,
    isValid: form.formState.isValid,
    isSharedLink: isShared,
    initialMode: computedInitialMode,
    initialBillData: decompressedValues.bd,
    initialSimpleData: decompressedValues.sd,
    mode,
    setMode: switchMode,
    subMode,
    setSubMode: switchSubMode,
    billData,
    setBillData,
    templateId,
    setTemplateId,
    isLoading,
    isInitialLoad
  };
}
