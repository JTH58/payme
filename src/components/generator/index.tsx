"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTwqr } from '@/hooks/use-twqr';
import { useAccounts } from '@/hooks/use-accounts';
import { useQrStyle } from '@/hooks/use-qr-style';
import { Button } from '@/components/ui/button';
import banks from '@/data/banks.json';
import { Share2, Check, Download, AlertTriangle, Users, Copy } from 'lucide-react';
import { buildShareUrl } from '@/lib/url-builder';
import { SEG, getRouteConfig, AppMode, VALID_MODES } from '@/config/routes';
import { FormSubMode } from '@/config/form-modes';
import { DEFAULT_QR_STYLE } from '@/config/qr-style';
import { AccountSwitcher } from './account-switcher';
import { QrBrandCard } from './qr-brand-card';
import { StyledQrCode } from './styled-qr-code';
import { ShareConfirmDialog } from './share-confirm-dialog';
import { UnifiedForm } from './unified-form';
import { PreviewSheet } from './preview-sheet';
import { QrStyleSheet } from './qr-style-sheet';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BankForm } from '@/modules/core/components/bank-form';
import { isAccountComplete } from '@/modules/core/utils/validators';
import { BillViewer } from '@/modules/bill/components/bill-viewer';
import { BillData, BillItem, SimpleData, CompressedData } from '@/types/bill';
import { Template } from '@/types/template';
import templatesData from '@/data/templates.json';
import { TemplateSubmitModal } from '@/components/template-submit-modal';
import { stripSensitiveFields, type TemplateFormState } from '@/modules/feedback/schemas/submit-schema';
import { AccountSheet } from './account-sheet';
import { TemplateSheet } from './template-sheet';
import { FirstVisitDisclaimer } from '@/components/legal/first-visit-disclaimer';
import { safeGetItem, safeSetItem } from '@/lib/safe-storage';
import { STORAGE_KEY as KEYS } from '@/config/storage-keys';

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
  qrStyleSheetOpen?: boolean;
  onQrStyleSheetOpenChange?: (open: boolean) => void;
}

export function Generator({ initialMode, initialData, isShared = false, initialBankCode, qrStyleSheetOpen, onQrStyleSheetOpenChange }: GeneratorProps) {
  const {
    form,
    qrString,
    generate,
    reset,
    isValid,
    isSharedLink,
    mode,
    setMode,
    subMode,
    setSubMode,
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

  const { formState: { errors } } = form;

  const [isCopied, setIsCopied] = useState(false);
  const [isAccountCopied, setIsAccountCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [accountCopyError, setAccountCopyError] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showTemplateSubmit, setShowTemplateSubmit] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [showAccountSheet, setShowAccountSheet] = useState(false);
  const [showTemplateSheet, setShowTemplateSheet] = useState(false);
  const [showPreviewSheet, setShowPreviewSheet] = useState(false);
  const [showFirstVisit, setShowFirstVisit] = useState(false);
  const [showStyleSheet, setShowStyleSheet] = useState(false);

  // QR style customization
  const {
    style: qrStyle,
    applyPreset: applyQrPreset,
    updateField: updateQrField,
    activePresetId: qrPresetId,
  } = useQrStyle();

  const qrCardRef = useRef<HTMLDivElement>(null);
  const pendingShareUrlRef = useRef<string>('');
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const accountCopyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const downloadTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const templateSnapshotRef = useRef<{
    subMode: FormSubMode;
    amount?: string;
    comment?: string;
    simpleHash?: string;
    billHash?: string;
  } | null>(null);
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
  useEffect(() => {
    if (isSharedLink || !accountsLoaded) return;
    if (!primaryAccount) return;

    // bankCode 與 accountNumber 獨立同步，互不阻擋
    if (primaryAccount.bankCode && form.getValues('bankCode') !== primaryAccount.bankCode) {
      form.setValue('bankCode', primaryAccount.bankCode, { shouldValidate: true });
    }
    if (primaryAccount.accountNumber && form.getValues('accountNumber') !== primaryAccount.accountNumber) {
      form.setValue('accountNumber', primaryAccount.accountNumber, { shouldValidate: true });
    }
  }, [primaryAccount, isSharedLink, accountsLoaded, form]);

  // 7G: bankCode 預填（從 /banks/[code] 導入時）
  useEffect(() => {
    if (initialBankCode && !isShared && accountsLoaded) {
      const validBank = banks.find(b => b.code === initialBankCode);
      if (validBank) {
        const isAllEmpty = accounts.every(acc => !acc.bankCode && !acc.accountNumber);
        if (isAllEmpty) {
          updateAccount(accounts[0].id, { bankCode: initialBankCode });
        } else {
          addAccount({ bankCode: initialBankCode });
        }
        form.setValue('bankCode', initialBankCode, { shouldValidate: true });
        form.setValue('accountNumber', '', { shouldValidate: true });
        setShowAccountSheet(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- accounts 故意省略
  }, [initialBankCode, isShared, accountsLoaded, form, updateAccount, addAccount]);

  const values = form.watch();

  // 查找當前使用的模板
  const activeTemplate = useMemo(
    () => templateId ? templates.find(t => t.id === templateId) ?? null : null,
    [templateId]
  );

  // 模板是否在其原始模式下啟用（mode 匹配 + 尚未被清除）
  const isTemplateActive = !!(activeTemplate && activeTemplate.mode === mode);

  const handleTemplateSelect = (t: Template) => {
    setTemplateId(t.id);

    const def = t.defaultValues;
    const snapshot: NonNullable<typeof templateSnapshotRef.current> = {
      subMode: t.mode === 'bill' ? 'itemized' : (def.pax ? 'split' : 'personal'),
    };

    if (t.mode === 'bill') {
      // Bill → itemized
      setSubMode('itemized');
      const bd = { t: def.title || '', m: ['我'], i: [] as BillItem[], s: (def.taxRate || 0) > 0 };
      setBillData(bd);
      snapshot.billHash = JSON.stringify(bd);
    } else if (def.pax) {
      // Pay + pax → split
      setSubMode('split');
      setSimpleData({ ta: def.amount?.toString() || '', pc: def.pax || 2, sc: false });
      snapshot.simpleHash = JSON.stringify({ ta: def.amount?.toString() || '', pc: def.pax || 2, sc: false });
    } else {
      // Pay without pax → personal
      setSubMode('personal');
      form.setValue('amount', def.amount?.toString() || '');
      form.setValue('comment', def.title || '');
      snapshot.amount = def.amount?.toString() || '';
      snapshot.comment = def.title || '';
    }

    templateSnapshotRef.current = snapshot;
  };

  // 即時計算 Share URL
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

  // 組合模板投稿用的 formState
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

  const executeShare = useCallback(async (shareUrl: string, passwordUsed: boolean) => {
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

    const passwordHint = passwordUsed ? '\n🔒 此連結需要密碼才能查看' : '';
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
  }, [sharePayload, form, isTemplateActive, activeTemplate, mode, billData]);

  const handleShare = () => {
    if (!sharePayload) return;
    pendingShareUrlRef.current = currentShareUrl;
    setShowShareDialog(true);
  };

  const handleConfirmShare = useCallback(async (finalUrl: string, passwordUsed: boolean) => {
    await executeShare(finalUrl, passwordUsed);
  }, [executeShare]);

  const buildEncryptedUrl = useCallback(async (password: string) => {
    if (!sharePayload) throw new Error('No share payload');
    return buildShareUrl(mode, sharePathParams, sharePayload, password);
  }, [mode, sharePathParams, sharePayload]);

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
  // 只在目前 subMode 與模板原始 subMode 相同時才比對，避免切換模式時中繼狀態觸發 dirty
  useEffect(() => {
    const snap = templateSnapshotRef.current;
    if (!templateId || !snap) return;
    if (subMode !== snap.subMode) return;

    let isDirty = false;

    if (snap.subMode === 'personal') {
      isDirty = values.amount !== snap.amount || values.comment !== snap.comment;
    } else if (snap.subMode === 'split' && simpleData && snap.simpleHash) {
      isDirty = JSON.stringify(simpleData) !== snap.simpleHash;
    } else if (snap.subMode === 'itemized' && billData && snap.billHash) {
      isDirty = JSON.stringify(billData) !== snap.billHash;
    }

    if (isDirty) {
      setTemplateId(undefined);
      templateSnapshotRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.amount, values.comment, simpleData, billData, subMode, templateId]);

  // ─── Render ────────────────────────────────────────

  // Guest mode (shared link) — separate render path
  if (isSharedLink) {
    return (
      <>
        <div
          className={`fixed inset-0 z-[9999] bg-[#020617]/60 backdrop-blur-3xl flex items-center justify-center transition-opacity duration-1000 ease-out ${isInitialLoad ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-[0.2em] animate-pulse">PayMe.TW</h1>
            <p className="text-white/40 text-sm tracking-widest uppercase">Secure . Private . Fast</p>
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto space-y-6 animate-accordion-down">
          {/* 全域銀行資訊區塊 */}
          {!isInitialLoad && (
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
          )}

          {/* Shared link header */}
          <div className="w-full max-w-md mx-auto bg-white/10 p-1 rounded-full flex items-center justify-between relative backdrop-blur-md">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full">
            {/* 左側：表單區 (read-only) */}
            <div className="flex flex-col gap-6">
              <div className="transition-all duration-500 min-h-0 md:min-h-[550px]">
                {isLoading ? (
                  <div className="space-y-6 p-1">
                    <div className="h-32 rounded-xl w-full animate-shimmer" />
                    <div className="h-64 rounded-xl w-full animate-shimmer" />
                  </div>
                ) : (
                  <>
                    {mode === 'bill' && (
                      <BillViewer form={form} billData={billData || { t: '', m: [], i: [], s: false }} />
                    )}
                    {mode === 'pay' && (
                      <div className="pointer-events-none opacity-80">
                        <UnifiedForm
                          form={form}
                          subMode={subMode}
                          onSubModeChange={() => {}}
                          reset={() => {}}
                          initialSplitData={initialSimpleData}
                          defaultSplitEnabled={!!initialSimpleData}
                          isSharedMode={true}
                          onConfirm={() => {}}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 右側：QR 預覽區 (guest) */}
            <div className="flex flex-col items-center justify-center min-h-0 md:min-h-[550px] relative overflow-hidden rounded-xl border border-white/10 bg-black/20 p-4 sm:p-8">
              {/* 多帳號切換器 */}
              {initialData?.ac && (
                <AccountSwitcher
                  accounts={initialData.ac}
                  currentBankCode={form.watch('bankCode')}
                  currentAccountNumber={form.watch('accountNumber')}
                  onSelect={handleAccountSwitch}
                />
              )}

              <div className="mb-6 text-center space-y-1">
                <h3 className="text-xl font-medium text-white/90">TWQR 預覽</h3>
                <p className="text-sm text-white/50">
                  {mode === 'bill' && !qrString
                    ? "👈 請先在左側選擇您的名字"
                    : (qrString
                      ? `掃描下方 QR Code 進行${mode === 'bill' ? '分帳' : '轉帳'}`
                      : "請先於左側輸入資料"
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
                    {mode === 'bill' ? (
                      <>
                        <Users className="w-8 h-8 opacity-50" />
                        <span className="text-xs">等待選擇身份...</span>
                      </>
                    ) : (
                      (() => {
                        const bc = form.watch('bankCode');
                        const an = form.watch('accountNumber');
                        if (!bc || !an) {
                          return (
                            <>
                              <AlertTriangle className="w-8 h-8 opacity-50 text-orange-500" />
                              <span className="text-xs font-medium text-orange-700">缺少銀行帳號</span>
                            </>
                          );
                        }
                        if (!isAccountComplete(bc, an)) {
                          return (
                            <>
                              <AlertTriangle className="w-8 h-8 opacity-50 text-orange-500" />
                              <span className="text-xs font-medium text-orange-700">
                                {!/^\d{3}$/.test(bc) ? '銀行代碼格式不正確' : '帳號必須為 10-16 碼數字'}
                              </span>
                            </>
                          );
                        }
                        return <span className="text-xs">等待輸入...</span>;
                      })()
                    )}
                  </div>
                </div>
              )}

              {qrString && (
                <div className="mt-8 w-full space-y-3">
                  {/* 複製帳號按鈕 */}
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
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shared Dialogs */}
        <Dialog open={isFullscreen && !!qrString} onOpenChange={setIsFullscreen}>
          <DialogContent className="sm:max-w-fit border-none bg-transparent shadow-none [&>button]:text-white/60">
            <DialogDescription className="sr-only">放大 QR Code</DialogDescription>
            <DialogTitle className="sr-only">QR Code 全螢幕檢視</DialogTitle>
            <div className="flex flex-col items-center">
              <div className="relative p-3 sm:p-6 md:p-8 bg-white rounded-3xl shadow-glow-white">
                <StyledQrCode data={qrString} style={DEFAULT_QR_STYLE} size={300} />
              </div>
              <p className="mt-6 text-white/50 text-sm">點擊 ✕ 或外部區域關閉</p>
            </div>
          </DialogContent>
        </Dialog>

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
                    <li>本網站僅協助產生符合 TWQR 格式的條碼，不經手任何金流。</li>
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
      </>
    );
  }

  // ─── Host mode ────────────────────────────────────

  return (
    <>
      <div
        className={`fixed inset-0 z-[9999] bg-[#020617]/60 backdrop-blur-3xl flex items-center justify-center transition-opacity duration-1000 ease-out ${isInitialLoad ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-[0.2em] animate-pulse">PayMe.TW</h1>
          <p className="text-white/40 text-sm tracking-widest uppercase">Secure . Private . Fast</p>
        </div>
      </div>

      <div className="w-full max-w-lg mx-auto space-y-6 animate-accordion-down">
        {/* Template Attribution Badge */}
        {isTemplateActive && activeTemplate?.author && (
          <div className="flex justify-center">
            <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-700">
              <p className="text-[10px] text-white/50 tracking-wider">
                TEMPLATE BY <span className="text-white/90 font-medium ml-1">{activeTemplate.author.name}</span>
              </p>
            </div>
          </div>
        )}

        {/* Unified Form */}
        {isLoading ? (
          <div className="space-y-6 p-1">
            <div className="h-32 rounded-xl w-full animate-shimmer" />
            <div className="h-64 rounded-xl w-full animate-shimmer" />
          </div>
        ) : (
          <UnifiedForm
            key={`unified-form-${templateId || 'default'}`}
            form={form}
            subMode={subMode}
            onSubModeChange={setSubMode}
            reset={reset}
            onSplitDataChange={setSimpleData}
            onBillDataChange={setBillData}
            initialSplitData={simpleData || initialSimpleData}
            initialBillData={billData}
            isTemplateActive={isTemplateActive}
            onShowTemplateSubmit={() => setShowTemplateSubmit(true)}
            onShowAccountSheet={() => setShowAccountSheet(true)}
            onShowTemplateSheet={() => setShowTemplateSheet(true)}
            onConfirm={() => {
              if (!safeGetItem(KEYS.hasVisited)) {
                setShowFirstVisit(true);
              } else {
                setShowPreviewSheet(true);
              }
            }}
          />
        )}
      </div>

      {/* Preview Bottom Sheet */}
      <PreviewSheet
        open={showPreviewSheet}
        onOpenChange={setShowPreviewSheet}
        form={form}
        subMode={subMode}
        qrString={qrString}
        currentShareUrl={currentShareUrl}
        qrStyle={qrStyle}
        onOpenStyleSheet={() => setShowStyleSheet(true)}
        sharedAccounts={sharedAccounts.length > 1
          ? sharedAccounts.map(acc => ({ b: acc.bankCode, a: acc.accountNumber }))
          : undefined
        }
        onAccountSwitch={handleAccountSwitch}
        onOpenAccountSheet={() => setShowAccountSheet(true)}
        billTitle={billData?.t}
        memberCount={billData?.m?.length}
        currentBankName={currentBankName}
        onShare={handleShare}
        onDownload={handleDownload}
        isCopied={isCopied}
        isDownloaded={isDownloaded}
        copyError={copyError}
        qrCardRef={qrCardRef}
      />

      {/* All Dialogs */}
      <Dialog open={isFullscreen && !!qrString} onOpenChange={setIsFullscreen}>
        <DialogContent className="sm:max-w-fit border-none bg-transparent shadow-none [&>button]:text-white/60">
          <DialogDescription className="sr-only">放大 QR Code</DialogDescription>
          <DialogTitle className="sr-only">QR Code 全螢幕檢視</DialogTitle>
          <div className="flex flex-col items-center">
            <div className="relative p-3 sm:p-6 md:p-8 bg-white rounded-3xl shadow-glow-white">
              <StyledQrCode data={qrString} style={qrStyle} size={300} />
            </div>
            <p className="mt-6 text-white/50 text-sm">點擊 ✕ 或外部區域關閉</p>
          </div>
        </DialogContent>
      </Dialog>

      <ShareConfirmDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        shareText={shareTextPreview}
        shareUrl={pendingShareUrlRef.current}
        shortenerMode={mode === 'bill' ? 'bill' : 'simple'}
        buildEncryptedUrl={buildEncryptedUrl}
        onConfirmShare={handleConfirmShare}
      />

      <AccountSheet
        open={showAccountSheet}
        onOpenChange={setShowAccountSheet}
        accounts={accounts}
        primaryAccount={primaryAccount}
        sharedAccounts={sharedAccounts}
        onAddAccount={addAccount}
        onRemoveAccount={removeAccount}
        onUpdateAccount={updateAccount}
        onToggleShared={toggleShared}
      />

      <TemplateSheet
        open={showTemplateSheet}
        onOpenChange={setShowTemplateSheet}
        onSelect={handleTemplateSelect}
      />

      <QrStyleSheet
        open={showStyleSheet || !!qrStyleSheetOpen}
        onOpenChange={(open) => {
          setShowStyleSheet(open);
          onQrStyleSheetOpenChange?.(open);
        }}
        style={qrStyle}
        activePresetId={qrPresetId}
        qrPreviewData={qrString || 'https://payme.tw'}
        onApplyPreset={applyQrPreset}
        onUpdateField={updateQrField}
      />

      <TemplateSubmitModal
        open={showTemplateSubmit}
        onOpenChange={setShowTemplateSubmit}
        formState={templateFormState}
      />

      <FirstVisitDisclaimer
        open={showFirstVisit}
        onAccept={() => {
          safeSetItem(KEYS.hasVisited, 'true');
          setShowFirstVisit(false);
          setShowPreviewSheet(true);
        }}
      />

    </>
  );
}
