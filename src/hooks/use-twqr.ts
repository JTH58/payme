import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { twqrFormSchema, type TwqrFormValues } from '@/modules/core/utils/validators';
import { createTwqrString } from '@/modules/twqr/core/builder';
import { BillData, CompressedData } from '@/types/bill';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/safe-storage';
import { AppMode } from '@/config/routes';
import { STORAGE_KEY } from '@/config/storage-keys';

/** 時序常數 */
export const SPLASH_DURATION_MS = 600;
export const SKELETON_DURATION_MS = 300;

const STORAGE_KEYS: Record<AppMode | 'billData' | 'lastMode', string> = {
  pay: STORAGE_KEY.payment,
  bill: STORAGE_KEY.bill,
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

  const [mode, setMode] = useState<AppMode>(computedInitialMode);

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

  // 0. 還原上次使用的模式
  useEffect(() => {
    if (isShared) {
      setIsInitialLoad(false);
      if (computedInitialMode) {
        setMode(computedInitialMode);
      }
      return;
    }

    const lastMode = safeGetItem(STORAGE_KEYS.lastMode) as AppMode;
    if (lastMode && ['pay', 'bill'].includes(lastMode)) {
      if (lastMode !== mode) {
        setMode(lastMode);
      }
    }

    const timer = setTimeout(() => setIsInitialLoad(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: 加入 mode/computedInitialMode 會在模式切換時重新初始化
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
    safeSetItem(STORAGE_KEYS.lastMode, mode);

    const savedForm = safeGetItem(STORAGE_KEYS[mode]);
    const savedBillData = mode === 'bill' ? safeGetItem(STORAGE_KEYS.billData) : null;

    if (savedForm) {
      try {
        const parsedForm = JSON.parse(savedForm);
        // 移除舊的 accounts 欄位（已遷移到 payme_accounts）
        delete parsedForm.accounts;

        form.reset({
          bankCode: parsedForm.bankCode || '',
          accountNumber: parsedForm.accountNumber || '',
          amount: parsedForm.amount || '',
          comment: parsedForm.comment || '',
        });

        const validation = twqrFormSchema.safeParse(parsedForm);

        timers.push(setTimeout(() => {
           form.trigger();
           if (validation.success) {
             generateQr(parsedForm);
           }
        }, 0));
      } catch { /* localStorage 讀取失敗，使用預設值 */ }
    } else {
      // 該模式沒有紀錄 → 只設定 amount/comment 為空
      // bankCode/accountNumber 由 useAccounts.primaryAccount 驅動
      const currentBank = form.getValues('bankCode') || '';
      const currentAccount = form.getValues('accountNumber') || '';
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
  }, [mode, isShared, form]);

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
        safeSetItem(STORAGE_KEYS[mode], JSON.stringify({ bankCode, accountNumber, amount, comment }));
      }, 400);
    });

    return () => {
      clearTimeout(saveTimerRef.current);
      subscription.unsubscribe();
    };
  }, [mode, isShared, form]);

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
      safeSetItem(STORAGE_KEYS.billData, JSON.stringify(billData));
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
      safeRemoveItem(STORAGE_KEYS[mode]);
      if (mode === 'bill') safeRemoveItem(STORAGE_KEYS.billData);
    }
  };

  const switchMode = (newMode: AppMode) => {
    if (newMode === mode) return;
    setIsLoading(true);
    setMode(newMode);
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
    billData,
    setBillData,
    templateId,
    setTemplateId,
    isLoading,
    isInitialLoad
  };
}
