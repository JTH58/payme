"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTwqr } from '@/hooks/use-twqr';
import { useAccounts } from '@/hooks/use-accounts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import banks from '@/data/banks.json';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, Check, Download, AlertTriangle, Users, Receipt, Copy, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { buildShareUrl } from '@/lib/url-builder';
import { isCryptoAvailable } from '@/lib/crypto';
import { SEG, getRouteConfig, AppMode, VALID_MODES } from '@/config/routes';
import { AccountSwitcher } from './account-switcher';
import { QrBrandCard, QR_CENTER_LABEL } from './qr-brand-card';
import { ShareConfirmDialog } from './share-confirm-dialog';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentForm } from '@/modules/payment/components/payment-form';
import { BillForm } from '@/modules/bill/components/bill-form';
import { BankForm } from '@/modules/core/components/bank-form';
import { BillViewer } from '@/modules/bill/components/bill-viewer';
import { BillData, BillItem, SimpleData, CompressedData } from '@/types/bill';
import { TemplateGallery } from '@/modules/templates/components/TemplateGallery';
import { Template } from '@/types/template';
import templatesData from '@/data/templates.json';
import { TemplateSubmitModal } from '@/components/template-submit-modal';
import { stripSensitiveFields, type TemplateFormState } from '@/modules/feedback/schemas/submit-schema';
import { FileUp } from 'lucide-react';

function isValidTemplate(item: unknown): item is Template {
  if (typeof item !== 'object' || item === null) return false;
  const t = item as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.mode === 'string' &&
    (VALID_MODES as readonly string[]).includes(t.mode)
  );
}

const templates: Template[] = (templatesData as unknown[]).filter(isValidTemplate);

/** 分帳資料是否足夠產生分享連結（至少 2 人 + 至少 1 筆明細） */
function isBillDataSufficient(data: BillData | undefined): boolean {
  if (!data) return false;
  if (!data.m || data.m.length < 2) return false;
  if (!data.i || data.i.length === 0) return false;
  return true;
}

interface GeneratorProps {
  initialMode?: AppMode | null;
  initialData?: CompressedData | null;
  isShared?: boolean;
  initialBankCode?: string | null;
}

export function Generator({ initialMode, initialData, isShared = false, initialBankCode }: GeneratorProps) {
  const {
    form,
    qrString,
    generate,
    reset,
    isValid,
    isSharedLink,
    mode,
    setMode,
    billData,
    setBillData,
    templateId,
    setTemplateId,
    initialSimpleData,
    isLoading,
    isInitialLoad
  } = useTwqr({ initialMode, initialData, isShared });

  // 統一帳戶管理
  const {
    accounts,
    sharedAccounts,
    primaryAccount,
    addAccount,
    removeAccount,
    updateAccount,
    toggleShared,
    isLoaded: accountsLoaded,
  } = useAccounts();

  const [simpleData, setSimpleData] = useState<SimpleData | undefined>(undefined);
  const [currentTemplateValues, setCurrentTemplateValues] = useState<SimpleData | null>(null);
  const [defaultSplitEnabled, setDefaultSplitEnabled] = useState(false);

  const { formState: { errors } } = form;

  const [isCopied, setIsCopied] = useState(false);
  const [isAccountCopied, setIsAccountCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [accountCopyError, setAccountCopyError] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPasswordEnabled, setIsPasswordEnabled] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [showSharePassword, setShowSharePassword] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showTemplateSubmit, setShowTemplateSubmit] = useState(false);
  const [showEncryptionFailDialog, setShowEncryptionFailDialog] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  const qrCardRef = useRef<HTMLDivElement>(null);
  const plaintextFallbackRef = useRef<string>('');
  const pendingShareUrlRef = useRef<string>('');
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const accountCopyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const downloadTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const templateSnapshotRef = useRef<{
    mode: AppMode;
    amount?: string;
    comment?: string;
    simpleHash?: string;
    billHash?: string;
  } | null>(null);
  const cryptoAvailable = isCryptoAvailable();

  // Cleanup all timeout refs on unmount
  useEffect(() => {
    return () => {
      clearTimeout(copyTimeoutRef.current);
      clearTimeout(accountCopyTimeoutRef.current);
      clearTimeout(downloadTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isSharedLink) {
      setShowDisclaimer(true);
    }
  }, [isSharedLink]);

  // primaryAccount 變化時同步到 form（非分享連結模式）
  // 只在 primaryAccount 有實際值時同步，避免覆蓋 initialBankCode 等外部預填
  useEffect(() => {
    if (isSharedLink || !accountsLoaded) return;
    if (!primaryAccount?.bankCode || !primaryAccount?.accountNumber) return;

    if (form.getValues('bankCode') !== primaryAccount.bankCode) {
      form.setValue('bankCode', primaryAccount.bankCode, { shouldValidate: true });
    }
    if (form.getValues('accountNumber') !== primaryAccount.accountNumber) {
      form.setValue('accountNumber', primaryAccount.accountNumber, { shouldValidate: true });
    }
  }, [primaryAccount, isSharedLink, accountsLoaded, form]);

  // 7G: bankCode 預填（從 /banks/[code] 導入時）
  useEffect(() => {
    if (initialBankCode && !isShared && accountsLoaded) {
      const validBank = banks.find(b => b.code === initialBankCode);
      if (validBank) {
        form.setValue('bankCode', initialBankCode, { shouldValidate: true });
        // 同步更新 useAccounts 中的第一筆帳戶
        if (accounts.length > 0) {
          updateAccount(accounts[0].id, { bankCode: initialBankCode });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- accounts 故意省略：加入會在每次帳戶編輯時重新執行預填
  }, [initialBankCode, isShared, accountsLoaded, form, updateAccount]);

  const values = form.watch();

  // 查找當前使用的模板（提前定義，供 currentShareUrl / handleShare 使用）
  const activeTemplate = useMemo(
    () => templateId ? templates.find(t => t.id === templateId) ?? null : null,
    [templateId]
  );

  // 模板是否在其原始模式下啟用（mode 匹配 + 尚未被清除）
  const isTemplateActive = !!(activeTemplate && activeTemplate.mode === mode);

  const handleTemplateSelect = (t: Template) => {
    setTemplateId(t.id);
    setMode(t.mode as AppMode);

    const def = t.defaultValues;
    const snapshot: NonNullable<typeof templateSnapshotRef.current> = { mode: t.mode as AppMode };

    if (t.mode === 'pay' && def.pax) {
      // 有 pax → 開啟均分
      const sv = { ta: def.amount?.toString() || '', pc: def.pax || 2, sc: false };
      setCurrentTemplateValues(sv);
      setDefaultSplitEnabled(true);
      setSimpleData(sv);
      snapshot.simpleHash = JSON.stringify(sv);
    } else if (t.mode === 'bill') {
      const bd = { t: def.title || '', m: ['我'], i: [] as BillItem[], s: (def.taxRate || 0) > 0 };
      setBillData(bd);
      snapshot.billHash = JSON.stringify(bd);
      setCurrentTemplateValues(null);
      setDefaultSplitEnabled(false);
    } else {
      // payment without pax → 直接輸入
      form.setValue('amount', def.amount?.toString() || '');
      form.setValue('comment', def.title || '');
      snapshot.amount = def.amount?.toString() || '';
      snapshot.comment = def.title || '';
      setCurrentTemplateValues(null);
      setDefaultSplitEnabled(false);
    }

    templateSnapshotRef.current = snapshot;
  };

  const handlePasswordToggle = () => {
    const next = !isPasswordEnabled;
    setIsPasswordEnabled(next);
    if (!next) {
      setSharePassword('');
      setShowSharePassword(false);
    }
  };

  // 即時計算 Share URL（供 QrBrandCard + ShortenerDialog 使用）
  // 共用 payload + pathParams（供 currentShareUrl + handleShare 使用）
  const { sharePayload, sharePathParams } = useMemo(() => {
    const { bankCode, accountNumber, amount, comment } = form.getValues();
    if (!bankCode || !accountNumber) return { sharePayload: null, sharePathParams: {} };

    const compactAccounts = sharedAccounts
      .filter(acc => acc.bankCode && acc.accountNumber)
      .map(acc => ({
        b: acc.bankCode,
        a: acc.accountNumber
      }));

    const payload: CompressedData = {
      b: bankCode,
      a: accountNumber,
      m: amount || '',
      c: comment || '',
      mo: mode === 'pay' ? 'pay' : 'bill'
    };

    if (compactAccounts.length > 0) {
      payload.ac = compactAccounts;
    }

    if (isTemplateActive && templateId) {
      payload.tid = templateId;
    }

    if (mode === 'bill') {
      if (!isBillDataSufficient(billData)) return { sharePayload: null, sharePathParams: {} };
      payload.bd = billData!;
    }

    if (mode === 'pay' && simpleData) {
      payload.sd = simpleData;
    }

    const routeConfig = getRouteConfig(mode);

    const segmentValues: Record<string, string | number | undefined> = {
      [SEG.TITLE]: mode === 'bill' ? (billData?.t || '') : (comment || ''),
      [SEG.PAX]: simpleData?.pc,
      [SEG.TEMPLATE_ID]: isTemplateActive ? templateId : undefined,
    };

    const pathParams: Record<string, string | number | undefined> = {};
    for (const seg of routeConfig.segments) {
      pathParams[seg.key] = segmentValues[seg.key];
    }

    return { sharePayload: payload, sharePathParams: pathParams };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, mode, billData, simpleData, templateId, isTemplateActive, sharedAccounts]);

  const currentShareUrl = useMemo(() => {
    if (!sharePayload) return '';
    return buildShareUrl(mode, sharePathParams, sharePayload) as string;
  }, [sharePayload, sharePathParams, mode]);

  // 取得當前銀行名稱
  const currentBankName = useMemo(() => {
    const bankCode = form.getValues('bankCode');
    const bank = banks.find(b => b.code === bankCode);
    return bank ? `${bank.code} ${bank.name}` : bankCode || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  // 分帳模式：帳戶資訊是否齊全 + 帳單是否足夠
  const hasBankInfo = !!(values.bankCode && values.accountNumber);
  const billSufficient = isBillDataSufficient(billData);

  // 分享文字預覽（供 ShareConfirmDialog 顯示）
  const shareTextPreview = useMemo(() => {
    const { bankCode, accountNumber, amount, comment } = form.getValues();
    const primaryBank = banks.find(b => b.code === bankCode);
    const bankName = primaryBank ? `${primaryBank.code} ${primaryBank.name}` : bankCode;
    const authorCredit = (isTemplateActive && activeTemplate?.author) ? `(Template by ${activeTemplate.author.name})` : '';
    const compactAccounts = sharePayload?.ac || [];

    let text = '';
    if (compactAccounts.length > 1) {
      text += `可選擇以下收款帳戶：\n`;
      compactAccounts.forEach(acc => {
        const bName = banks.find(b => b.code === acc.b)?.name || acc.b;
        text += `- ${bName} (${acc.b}): ${acc.a}\n`;
      });
    } else {
      text += `銀行：${bankName}\n帳號：${accountNumber}`;
    }

    if (mode === 'bill') {
      text += `\n\n🧾 分帳明細：${billData?.t || '未命名帳單'} ${authorCredit}`;
      text += `\n總金額：${amount} 元`;
      text += `\n(點擊連結查看您的應付金額)`;
    } else {
      if (amount) text += `\n金額：${amount} 元`;
      if (comment) text += `\n備註：${comment} ${authorCredit}`;
    }
    return text;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, mode, billData, sharePayload, isTemplateActive, activeTemplate]);

  // 組合模板投稿用的 formState（已 strip 敏感欄位）
  const templateFormState = useMemo((): TemplateFormState => {
    const raw: Record<string, unknown> = { mode };
    const { amount, comment } = form.getValues();
    if (comment) raw.title = comment;
    if (amount) raw.amount = amount;
    if (mode === 'pay' && simpleData) {
      raw.pax = simpleData.pc;
    }
    if (mode === 'bill' && billData) {
      if (billData.t) raw.title = billData.t;
      if (billData.m?.length) raw.members = billData.m;
      if (billData.i?.length) raw.items = billData.i;
      if (billData.s) raw.taxRate = 10;
    }
    return stripSensitiveFields(raw) as TemplateFormState;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, mode, billData, simpleData]);

  // 下載品牌化 QR 圖片
  const showDownloadSuccess = useCallback(() => {
    setIsDownloaded(true);
    clearTimeout(downloadTimeoutRef.current);
    downloadTimeoutRef.current = setTimeout(() => setIsDownloaded(false), 2000);
  }, []);

  const handleDownload = useCallback(async () => {
    const { bankCode, accountNumber } = form.getValues();
    const filename = `payme-tw-${bankCode || 'unknown'}-${accountNumber || 'qr'}.png`;

    if (qrCardRef.current) {
      try {
        const { toPng } = await import('html-to-image');
        const dataUrl = await toPng(qrCardRef.current, { cacheBust: true });
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
        showDownloadSuccess();
        return;
      } catch (err) {
        console.warn('html-to-image 失敗，降級為 Canvas 方式', err);
      }
    }

    // Fallback: old SVG→Canvas approach
    const svg = document.getElementById('qr-code-svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width + 40;
        canvas.height = img.height + 40;

        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 20, 20);

          const pngFile = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.download = filename;
          downloadLink.href = pngFile;
          downloadLink.click();
          showDownloadSuccess();
        }
      };

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    }
  }, [form, showDownloadSuccess]);

  const executeShare = useCallback(async (shareUrl: string) => {
    if (!sharePayload) return;

    const { bankCode, accountNumber, amount, comment } = form.getValues();

    const primaryBank = banks.find(b => b.code === bankCode);
    const bankName = primaryBank ? `${primaryBank.code} ${primaryBank.name}` : bankCode;

    const authorCredit = (isTemplateActive && activeTemplate?.author) ? `(Template by ${activeTemplate.author.name})` : '';

    const compactAccounts = sharePayload.ac || [];
    let shareText = '';

    if (compactAccounts.length > 1) {
      shareText += `可選擇以下收款帳戶：\n`;
      compactAccounts.forEach(acc => {
        const bName = banks.find(b => b.code === acc.b)?.name || acc.b;
        shareText += `- ${bName} (${acc.b}): ${acc.a}\n`;
      });
    } else {
      shareText += `銀行：${bankName}\n帳號：${accountNumber}`;
    }

    if (mode === 'bill') {
      shareText += `\n\n🧾 分帳明細：${billData?.t || '未命名帳單'} ${authorCredit}`;
      shareText += `\n總金額：${amount} 元`;
      shareText += `\n(點擊連結查看您的應付金額)`;
    } else {
      if (amount) shareText += `\n金額：${amount} 元`;
      if (comment) shareText += `\n備註：${comment} ${authorCredit}`;
    }

    const trimmedSharePassword = sharePassword.trim();
    const passwordHint = (isPasswordEnabled && trimmedSharePassword)
      ? '\n🔒 此連結需要密碼才能查看'
      : '';
    const fullShareContent = `${shareText}${passwordHint}\n\n收款連結：\n${shareUrl}`;

    const shareData = {
      title: 'PayMe.tw 收款連結',
      text: shareText,
      url: shareUrl,
    };

    const copyToClipboard = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(fullShareContent);
          setIsCopied(true);
          clearTimeout(copyTimeoutRef.current);
          copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
        } else {
          throw new Error('Clipboard API not available');
        }
      } catch (err) {
        try {
          const textArea = document.createElement("textarea");
          textArea.value = fullShareContent;
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          textArea.style.top = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          // Deprecated but still widely supported; kept as Clipboard API fallback
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          if (successful) {
            setIsCopied(true);
            clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
            return;
          } else {
            throw new Error('execCommand failed');
          }
        } catch (fallbackErr) {
          console.error('複製失敗', fallbackErr);
          setCopyError('您的瀏覽器不支援自動複製，請手動複製網址');
          setTimeout(() => setCopyError(''), 3000);
        }
      }
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.warn('原生分享失敗，降級為複製連結', err);
        await copyToClipboard();
      }
    } else {
      await copyToClipboard();
    }
  }, [sharePayload, form, isTemplateActive, activeTemplate, mode, billData, sharePassword, isPasswordEnabled]);

  const handleShare = async () => {
    if (!sharePayload) return;

    let shareUrl: string;
    const trimmedSharePassword = sharePassword.trim();
    try {
      shareUrl = (isPasswordEnabled && trimmedSharePassword)
        ? await buildShareUrl(mode, sharePathParams, sharePayload, trimmedSharePassword)
        : buildShareUrl(mode, sharePathParams, sharePayload);
    } catch (err) {
      console.error('加密失敗', err);
      plaintextFallbackRef.current = buildShareUrl(mode, sharePathParams, sharePayload) as string;
      setShowEncryptionFailDialog(true);
      return;
    }

    pendingShareUrlRef.current = shareUrl;
    setShowShareDialog(true);
  };

  const handleConfirmShare = useCallback(async (finalUrl: string) => {
    await executeShare(finalUrl);
  }, [executeShare]);

  const handleAccountSwitch = (b: string, a: string) => {
    form.setValue('bankCode', b, { shouldValidate: true });
    form.setValue('accountNumber', a, { shouldValidate: true });
  };

  const handleCopyAccount = async () => {
    const { accountNumber } = form.getValues();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(accountNumber);
        setIsAccountCopied(true);
        clearTimeout(accountCopyTimeoutRef.current);
        accountCopyTimeoutRef.current = setTimeout(() => setIsAccountCopied(false), 2000);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (e) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = accountNumber;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        // Deprecated but still widely supported; kept as Clipboard API fallback
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          setIsAccountCopied(true);
          clearTimeout(accountCopyTimeoutRef.current);
          accountCopyTimeoutRef.current = setTimeout(() => setIsAccountCopied(false), 2000);
          return;
        }
        throw new Error('execCommand failed');
      } catch (fallbackErr) {
        setAccountCopyError('複製失敗，請手動複製帳號');
        setTimeout(() => setAccountCopyError(''), 3000);
      }
    }
  };

  // 模板參數變更偵測 — 使用者改過任何值即永久清除 templateId
  useEffect(() => {
    const snap = templateSnapshotRef.current;
    if (!templateId || !snap || snap.mode !== mode) return;

    let isDirty = false;

    if (snap.mode === 'pay' && !snap.simpleHash) {
      // payment 模式無均分 → 偵測 amount/comment
      isDirty = values.amount !== snap.amount || values.comment !== snap.comment;
    } else if (snap.mode === 'pay' && simpleData && snap.simpleHash) {
      isDirty = JSON.stringify(simpleData) !== snap.simpleHash;
    } else if (snap.mode === 'bill' && billData && snap.billHash) {
      isDirty = JSON.stringify(billData) !== snap.billHash;
    }

    if (isDirty) {
      setTemplateId(undefined);
      templateSnapshotRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.amount, values.comment, simpleData, billData, mode, templateId]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[9999] bg-[#020617]/60 backdrop-blur-3xl flex items-center justify-center transition-opacity duration-1000 ease-out ${isInitialLoad ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
      >
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-[0.2em] animate-pulse">
            PayMe.TW
          </h1>
          <p className="text-white/40 text-sm tracking-widest uppercase">
            Secure . Private . Fast
          </p>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto space-y-6 animate-accordion-down">
        {/* 全域銀行資訊區塊 (置頂) */}
        {!isInitialLoad && (
          <>
            {!isSharedLink && (
              <TemplateGallery onSelect={handleTemplateSelect} />
            )}
            <BankForm
              accounts={accounts}
              primaryAccount={primaryAccount}
              sharedAccounts={sharedAccounts}
              onAddAccount={addAccount}
              onRemoveAccount={removeAccount}
              onUpdateAccount={updateAccount}
              onToggleShared={toggleShared}
              isSharedLink={isSharedLink}
              sharedLinkBankCode={form.watch('bankCode')}
              sharedLinkAccountNumber={form.watch('accountNumber')}
            />
          </>
        )}

        {/* 模式切換按鈕 */}
        <div className="w-full max-w-md mx-auto bg-white/10 p-1 rounded-full flex items-center justify-between relative backdrop-blur-md">
          {isSharedLink ? (
            <div className="w-full flex items-center justify-between px-4 py-2">
              <span className="text-sm text-white/60">
                ✨ 這是 {mode === 'bill' ? '分帳' : '收款'} 連結 (唯讀模式)
              </span>
              <button
                onClick={() => window.location.href = '/'}
                className="text-xs bg-white text-black px-3 py-1 rounded-full hover:bg-white/90 font-medium"
              >
                建立我的收款碼
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setMode('pay')}
                aria-pressed={mode === 'pay'}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-300 active:scale-[0.98] ${mode === 'pay' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                收款
              </button>
              <button
                onClick={() => setMode('bill')}
                aria-pressed={mode === 'bill'}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-300 active:scale-[0.98] ${mode === 'bill' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                分帳
              </button>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* 左側：表單區 */}
          <div className="flex flex-col gap-6">

            <div className="transition-all duration-500 min-h-[550px]">
              {isLoading ? (
                <div className="space-y-6 p-1">
                  <div className="h-32 rounded-xl w-full animate-shimmer" />
                  <div className="h-64 rounded-xl w-full animate-shimmer" />
                </div>
              ) : (
                <>
                  {mode === 'pay' && (
                    <div className={isSharedLink ? "pointer-events-none opacity-80" : ""}>
                      <PaymentForm
                        key={`payment-form-${mode}-${templateId || 'default'}`}
                        form={form}
                        reset={reset}
                        initialSplitData={currentTemplateValues || initialSimpleData}
                        onSplitDataChange={setSimpleData}
                        isSharedMode={isSharedLink}
                        defaultSplitEnabled={defaultSplitEnabled || !!initialSimpleData}
                      />
                    </div>
                  )}

                  {mode === 'bill' && (
                    isSharedLink ? (
                      <BillViewer form={form} billData={billData || { t: '', m: [], i: [], s: false }} />
                    ) : (
                      <BillForm
                        key={`bill-form-${templateId || 'default'}`}
                        form={form}
                        onBillDataChange={setBillData}
                        initialData={billData}
                      />
                    )
                  )}
                </>
              )}
            </div>
          </div>

          {/* 右側：預覽區 */}
          <Card className="flex flex-col items-center justify-center min-h-[550px] relative overflow-hidden group border-white/10 bg-black/20">

            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <CardContent className="flex flex-col items-center z-10 p-8 w-full min-h-[550px] justify-center">
              {/* 署名顯示區域 (Credit Badge) — 僅在模板原始模式下顯示 */}
              {isTemplateActive && activeTemplate?.author && (
                <div className="absolute top-4 right-4 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-700">
                  <p className="text-[10px] text-white/50 tracking-wider">
                    TEMPLATE BY <span className="text-white/90 font-medium ml-1">{activeTemplate.author.name}</span>
                  </p>
                </div>
              )}

              {isLoading ? (
                <div className="w-full flex flex-col items-center space-y-8">
                  <div className="h-7 w-32 rounded-lg animate-shimmer" />
                  <div className="w-[230px] h-[230px] rounded-2xl animate-shimmer" />
                  <div className="h-16 w-full rounded-lg animate-shimmer" />
                </div>
              ) : (
                <>
                  {/* 分帳模式 (Host) 特殊顯示 */}
                  {mode === 'bill' && !isSharedLink ? (
                    <div className="flex flex-col items-center space-y-6 w-full">
                      {/* 品牌化 QR Card — Share URL */}
                      {currentShareUrl && (
                        <>
                          <div className="text-center space-y-1">
                            <h3 className="text-xl font-medium text-white/90">TWQR 預覽</h3>
                            <p className="text-sm text-white/50">掃描下方 QR Code 進行分帳</p>
                          </div>
                          <QrBrandCard
                            ref={qrCardRef}
                            variant="share"
                            qrValue={currentShareUrl}
                            billTitle={billData?.t || ''}
                            billTotal={form.watch('amount') || ''}
                            memberCount={billData?.m?.length || 0}
                          />
                        </>
                      )}

                      {!currentShareUrl && (
                        <>
                          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-2 ${billSufficient ? 'bg-orange-500/20' : 'bg-purple-500/20 animate-bounce-slow'}`}>
                            {billSufficient
                              ? <AlertTriangle className="w-10 h-10 text-orange-300" />
                              : <Receipt className="w-10 h-10 text-purple-300" />
                            }
                          </div>
                          <div className="text-center space-y-2">
                            {!billSufficient ? (
                              <>
                                <h3 className="text-xl font-bold text-white">建立分帳明細</h3>
                                <div className="text-white/60 text-sm space-y-1">
                                  {(!billData?.m || billData.m.length < 2) && (
                                    <p>👥 請在左側新增至少一位朋友</p>
                                  )}
                                  {(!billData?.i || billData.i.length === 0) && (
                                    <p>📝 請在左側新增至少一筆消費項目</p>
                                  )}
                                </div>
                              </>
                            ) : !hasBankInfo ? (
                              <>
                                <h3 className="text-xl font-bold text-white">分帳明細已就緒</h3>
                                <p className="text-orange-400/80 text-sm">
                                  ⚠️ 請先設定上方的「收款銀行」與「帳號」
                                </p>
                                <p className="text-white/40 text-xs">
                                  共 {billData?.i?.length || 0} 筆項目，由 {billData?.m?.length || 0} 人分攤
                                </p>
                              </>
                            ) : null}
                          </div>
                        </>
                      )}

                      {/* 密碼保護 Toggle */}
                      <div className="w-full max-w-xs space-y-3">
                        <button
                          type="button"
                          onClick={handlePasswordToggle}
                          disabled={!cryptoAvailable}
                          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 ${!cryptoAvailable ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                          <span className="flex items-center gap-2 text-sm text-white/70">
                            <Lock className="h-4 w-4" />
                            設定密碼保護
                          </span>
                          <div className={`w-9 h-5 rounded-full transition-colors duration-200 flex items-center ${isPasswordEnabled ? 'bg-blue-500 justify-end' : 'bg-white/20 justify-start'
                            }`}>
                            <div className="w-4 h-4 bg-white rounded-full shadow-sm mx-0.5" />
                          </div>
                        </button>
                        {!cryptoAvailable && (
                          <p className="text-xs text-red-400/80">您的瀏覽器不支援加密功能</p>
                        )}

                        {isPasswordEnabled && (
                          <div className="relative animate-in slide-in-from-top-1 fade-in duration-200">
                            <input
                              type={showSharePassword ? 'text' : 'password'}
                              value={sharePassword}
                              onChange={(e) => setSharePassword(e.target.value)}
                              placeholder="輸入分享密碼"
                              autoComplete="off"
                              autoCapitalize="off"
                              autoCorrect="off"
                              spellCheck={false}
                              className="glass-input h-10 rounded-lg w-full pr-10 pl-3 text-sm outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSharePassword(!showSharePassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                              tabIndex={-1}
                              aria-label={showSharePassword ? '隱藏密碼' : '顯示密碼'}
                            >
                              {showSharePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                        <Button
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20 active:scale-[0.96] transition-transform"
                          onClick={handleShare}
                          disabled={!currentShareUrl || (isPasswordEnabled && !sharePassword.trim())}
                        >
                          {isCopied ? <Check className="w-4 h-4 mr-2 animate-in zoom-in spin-in-12 duration-300" /> : <Share2 className="w-4 h-4 mr-2" />}
                          {isCopied ? "已複製" : "分享連結"}
                        </Button>
                        <Button
                          className="w-full bg-white text-black hover:bg-white/90 active:scale-[0.96] transition-transform"
                          onClick={handleDownload}
                          disabled={!currentShareUrl}
                        >
                          {isDownloaded ? <Check className="w-4 h-4 mr-2 animate-in zoom-in spin-in-12 duration-300" /> : <Download className="w-4 h-4 mr-2" />}
                          {isDownloaded ? '已下載' : '下載圖片'}
                        </Button>
                      </div>
                      {copyError && (
                        <p className="text-xs text-red-400 text-center">{copyError}</p>
                      )}

                      {/* 投稿入口 */}
                      {currentShareUrl && (
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setShowTemplateSubmit(true)}
                            disabled={isTemplateActive}
                            className={`text-xs transition-colors flex items-center gap-1 ${isTemplateActive ? 'text-white/20 cursor-not-allowed' : 'text-white/50 hover:text-white/80'}`}
                            title={isTemplateActive ? '請先修改模板內容再投稿' : undefined}
                          >
                            <FileUp className="h-3 w-3" />
                            投稿此模板
                          </button>
                        </div>
                      )}

                      <p className="text-xs text-white/30">
                        朋友們點擊連結後，可選擇自己的身份查看應付金額
                      </p>
                    </div>
                  ) : (
                    // 其他模式或訪客模式 (顯示 QR Code)
                    <>
                      {/* 多帳號切換器 */}
                      {isSharedLink && initialData?.ac && (
                        <AccountSwitcher
                          accounts={initialData.ac}
                          currentBankCode={form.watch('bankCode')}
                          currentAccountNumber={form.watch('accountNumber')}
                          onSelect={handleAccountSwitch}
                        />
                      )}
                      {!isSharedLink && sharedAccounts.length > 1 && (
                        <AccountSwitcher
                          accounts={sharedAccounts.map(acc => ({ b: acc.bankCode, a: acc.accountNumber }))}
                          currentBankCode={form.watch('bankCode')}
                          currentAccountNumber={form.watch('accountNumber')}
                          onSelect={handleAccountSwitch}
                        />
                      )}

                      <div className="mb-6 text-center space-y-1">
                        <h3 className="text-xl font-medium text-white/90">TWQR 預覽</h3>
                        <p className="text-sm text-white/50">
                          {mode === 'bill' && isSharedLink && !qrString
                            ? "👈 請先在左側選擇您的名字"
                            : (qrString
                              ? `掃描下方 QR Code 進行${mode === 'bill' ? '分帳' : '轉帳'}`
                              : (!form.watch('bankCode') || !form.watch('accountNumber')
                                ? "⚠️ 請先設定上方的「收款銀行」與「帳號」"
                                : "請先於左側輸入資料")
                            )
                          }
                        </p>
                      </div>

                      {qrString ? (
                        <div
                          className="cursor-zoom-in hover:scale-105 transition-all duration-500"
                          onClick={() => setIsFullscreen(true)}
                        >
                          <QrBrandCard
                            ref={qrCardRef}
                            variant="payment"
                            qrValue={qrString}
                            bankName={currentBankName}
                            accountNumber={form.watch('accountNumber')}
                          />
                        </div>
                      ) : (
                        <div className="p-4 bg-white rounded-2xl shadow-2xl">
                          <div className="w-[200px] h-[200px] bg-gray-100/50 rounded-lg flex flex-col items-center justify-center text-gray-400 space-y-2 text-center px-4">
                            {mode === 'bill' && isSharedLink ? (
                              <>
                                <Users className="w-8 h-8 opacity-50" />
                                <span className="text-xs">等待選擇身份...</span>
                              </>
                            ) : (
                              !form.watch('bankCode') || !form.watch('accountNumber') ? (
                                <>
                                  <AlertTriangle className="w-8 h-8 opacity-50 text-orange-500" />
                                  <span className="text-xs font-medium text-orange-700">缺少銀行帳號</span>
                                </>
                              ) : (
                                "等待輸入..."
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {qrString && (
                        <div className="mt-8 w-full space-y-3">
                          {/* 複製帳號按鈕 (僅在分享模式顯示) */}
                          {isSharedLink && (
                            <div className="space-y-1">
                              <Button
                                variant="outline"
                                className="w-full border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 text-white/80 h-10 gap-2"
                                onClick={handleCopyAccount}
                              >
                                {isAccountCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {isAccountCopied ? '已複製帳號' : `複製帳號 (${form.watch('accountNumber')})`}
                              </Button>
                              {accountCopyError && (
                                <p className="text-xs text-red-400 text-center">{accountCopyError}</p>
                              )}
                            </div>
                          )}

                          {/* 密碼保護 Toggle — 僅 Host 模式顯示 */}
                          {!isSharedLink && (
                            <div className="w-full max-w-xs mx-auto space-y-3">
                              <button
                                type="button"
                                onClick={handlePasswordToggle}
                                disabled={!cryptoAvailable}
                                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 ${!cryptoAvailable ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                              >
                                <span className="flex items-center gap-2 text-sm text-white/70">
                                  <Lock className="h-4 w-4" />
                                  設定密碼保護
                                </span>
                                <div className={`w-9 h-5 rounded-full transition-colors duration-200 flex items-center ${isPasswordEnabled ? 'bg-blue-500 justify-end' : 'bg-white/20 justify-start'
                                  }`}>
                                  <div className="w-4 h-4 bg-white rounded-full shadow-sm mx-0.5" />
                                </div>
                              </button>
                              {!cryptoAvailable && (
                                <p className="text-xs text-red-400/80">您的瀏覽器不支援加密功能</p>
                              )}

                              {isPasswordEnabled && (
                                <div className="relative animate-in slide-in-from-top-1 fade-in duration-200">
                                  <input
                                    type={showSharePassword ? 'text' : 'password'}
                                    value={sharePassword}
                                    onChange={(e) => setSharePassword(e.target.value)}
                                    placeholder="輸入分享密碼"
                                    autoComplete="off"
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    className="glass-input h-10 rounded-lg w-full pr-10 pl-3 text-sm outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowSharePassword(!showSharePassword)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                    tabIndex={-1}
                                    aria-label={showSharePassword ? '隱藏密碼' : '顯示密碼'}
                                  >
                                    {showSharePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button
                              className="w-full bg-white/10 hover:bg-white/20 border-white/10 text-white"
                              onClick={handleShare}
                              disabled={isSharedLink || (isPasswordEnabled && !sharePassword.trim())}
                            >
                              {isCopied ? <Check className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
                              {isCopied ? "已複製" : "分享連結"}
                            </Button>

                            <Button
                              className="w-full bg-white text-black hover:bg-white/90"
                              onClick={handleDownload}
                            >
                              {isDownloaded ? <Check className="w-4 h-4 mr-2 animate-in zoom-in spin-in-12 duration-300" /> : <Download className="w-4 h-4 mr-2" />}
                              {isDownloaded ? '已下載' : '下載圖片'}
                            </Button>
                          </div>
                          {copyError && (
                            <p className="text-xs text-red-400 text-center">{copyError}</p>
                          )}

                          {/* 縮網址 + 投稿入口 */}
                          {!isSharedLink && (
                            <div className="flex items-center justify-center pt-1">
                              <button
                                type="button"
                                onClick={() => setShowTemplateSubmit(true)}
                                disabled={isTemplateActive}
                                className={`text-xs transition-colors flex items-center gap-1 ${isTemplateActive ? 'text-white/20 cursor-not-allowed' : 'text-white/50 hover:text-white/80'}`}
                                title={isTemplateActive ? '請先修改模板內容再投稿' : undefined}
                              >
                                <FileUp className="h-3 w-3" />
                                投稿此模板
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {isFullscreen && qrString && (
        <div
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center cursor-zoom-out animate-in fade-in duration-300" // z-[9999] = Z_INDEX.FULLSCREEN — 需在所有元素之上
          onClick={() => setIsFullscreen(false)}
        >
          <div className="relative p-8 bg-white rounded-3xl shadow-glow-white transform scale-125">
            <QRCodeSVG
              value={qrString}
              size={300}
              level="Q"
              includeMargin={false}
              imageSettings={{
                src: QR_CENTER_LABEL,
                x: undefined,
                y: undefined,
                height: 24,
                width: 90,
                excavate: true,
              }}
            />
          </div>
          <p className="mt-12 text-white/50 text-sm animate-pulse">
            點擊任意處關閉
          </p>
        </div>
      )}

      <Dialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
        <DialogContent className="sm:max-w-md border-orange-500/20">
          <DialogHeader>
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <AlertTriangle className="h-6 w-6" />
              <DialogTitle className="text-xl">安全提醒與免責聲明</DialogTitle>
            </div>
            <DialogDescription asChild>
              <div className="text-left space-y-3 pt-2 text-base text-muted-foreground">
                <p>
                  您正透過分享連結訪問 <strong>PayMe.tw</strong>。這是一個第三方開源工具，
                  <span className="text-orange-600 font-semibold mx-1">並非</span>
                  任何銀行或支付機構的官方應用程式。
                </p>

                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>
                    本網站僅協助產生符合 TWQR 格式的條碼，不經手任何金流。
                  </li>
                  <li>
                    <span className="font-bold text-foreground">詐騙防範：</span>
                    請勿輕信來路不明的收款碼。付款前，請務必在您的銀行 App 內再次核對
                    「<span className="font-bold text-foreground">轉入帳號</span>」與
                    「<span className="font-bold text-foreground">金額</span>」。
                  </li>
                </ul>

                <p className="text-xs text-muted-foreground/80 mt-4 border-t pt-4">
                  免責聲明：使用本工具產生的 QR Code 進行交易之風險由使用者自行承擔，
                  開發者不對任何因使用本工具而產生的資金損失負責。
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 sm:justify-center">
            <Button
              type="button"
              className="w-full sm:w-auto min-w-[120px] bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => setShowDisclaimer(false)}
            >
              我知道了，繼續使用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareConfirmDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        shareText={shareTextPreview}
        shareUrl={pendingShareUrlRef.current}
        passwordHint={(isPasswordEnabled && sharePassword.trim()) ? '🔒 此連結需要密碼才能查看' : ''}
        shortenerMode={mode === 'bill' ? 'bill' : 'simple'}
        onConfirmShare={handleConfirmShare}
      />

      <TemplateSubmitModal
        open={showTemplateSubmit}
        onOpenChange={setShowTemplateSubmit}
        formState={templateFormState}
      />

      <Dialog open={showEncryptionFailDialog} onOpenChange={setShowEncryptionFailDialog}>
        <DialogContent className="sm:max-w-md border-orange-500/20">
          <DialogHeader>
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <ShieldAlert className="h-6 w-6" />
              <DialogTitle className="text-xl">加密失敗</DialogTitle>
            </div>
            <DialogDescription asChild>
              <div className="text-left space-y-3 pt-2 text-base text-muted-foreground">
                <p>
                  連結加密過程發生錯誤，無法產生加密連結。
                </p>
                <p className="text-sm">
                  您可以選擇以<span className="text-orange-500 font-semibold">未加密方式</span>分享，
                  但連結內容將不受密碼保護。
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEncryptionFailDialog(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => {
                setShowEncryptionFailDialog(false);
                executeShare(plaintextFallbackRef.current);
              }}
            >
              以未加密方式分享
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
