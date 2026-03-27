import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { TwqrFormValues } from '@/modules/core/utils/validators';
import { CompactAccount } from '@/types/bill';
import { FormSubMode } from '@/config/form-modes';
import type { QrStyleConfig } from '@/types/qr-style';
import { AccountSwitcher } from './account-switcher';
import { QrBrandCard } from './qr-brand-card';
import {
  Share2, Check, Download, Palette,
} from 'lucide-react';

interface PreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<TwqrFormValues>;
  subMode: FormSubMode;
  // QR data
  qrString: string;
  currentShareUrl: string;
  // QR style
  qrStyle?: QrStyleConfig;
  onOpenStyleSheet?: () => void;
  // Account switching
  sharedAccounts?: CompactAccount[];
  onAccountSwitch?: (bankCode: string, accountNumber: string) => void;
  // Bill info (itemized mode — for QrBrandCard share variant)
  billTitle?: string;
  memberCount?: number;
  // Branding info
  currentBankName: string;
  // Actions
  onOpenAccountSheet?: () => void;
  onShare: () => void;
  onDownload: () => void;
  // State
  isCopied: boolean;
  isDownloaded: boolean;
  copyError: string;
  // Ref for QR card
  qrCardRef: React.Ref<HTMLDivElement>;
}

export function PreviewSheet({
  open,
  onOpenChange,
  form,
  subMode,
  qrString,
  currentShareUrl,
  qrStyle,
  onOpenStyleSheet,
  sharedAccounts,
  onAccountSwitch,
  billTitle,
  memberCount,
  currentBankName,
  onOpenAccountSheet,
  onShare,
  onDownload,
  isCopied,
  isDownloaded,
  copyError,
  qrCardRef,
}: PreviewSheetProps) {
  const isItemized = subMode === 'itemized';
  const hasQr = isItemized ? !!currentShareUrl : !!qrString;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isItemized ? '分帳連結' : '預覽與分享'}</SheetTitle>
          <SheetDescription>{isItemized ? '掃碼或點擊連結即可查看明細' : '確認內容無誤後即可分享'}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-6">
          {/* Account switcher (non-itemized only) */}
          {!isItemized && sharedAccounts && sharedAccounts.length > 1 && onAccountSwitch && (
            <AccountSwitcher
              accounts={sharedAccounts}
              currentBankCode={form.watch('bankCode')}
              currentAccountNumber={form.watch('accountNumber')}
              onSelect={onAccountSwitch}
            />
          )}

          {/* QR Code */}
          <div className="flex flex-col items-center space-y-4">
            {hasQr ? (
              <>
                <QrBrandCard
                  ref={qrCardRef}
                  variant={isItemized ? 'share' : 'payment'}
                  qrValue={isItemized ? currentShareUrl : qrString}
                  qrStyle={qrStyle}
                  {...(isItemized ? {
                    billTitle: billTitle || '',
                    billTotal: form.watch('amount') || '',
                    memberCount: memberCount || 0,
                  } : {
                    bankName: currentBankName,
                    accountNumber: form.watch('accountNumber'),
                  })}
                />
              </>
            ) : (
              <div className="p-4 bg-white rounded-2xl shadow-2xl">
                <div className="w-[200px] h-[200px] bg-gray-100/50 rounded-lg flex flex-col items-center justify-center text-gray-400 space-y-2 text-center px-4">
                  {!form.watch('bankCode') || !form.watch('accountNumber') ? (
                    <button
                      type="button"
                      className="flex flex-col items-center gap-2 hover:text-gray-600 transition-colors"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenAccountSheet?.();
                      }}
                    >
                      <span className="text-xs font-medium text-orange-700">⚠️ 缺少銀行帳號</span>
                      <span className="text-[10px] text-blue-500 underline underline-offset-2">前往帳戶設定</span>
                    </button>
                  ) : (
                    <span className="text-xs">等待輸入...</span>
                  )}
                </div>
              </div>
            )}

            {/* Customize Style Button */}
            {hasQr && onOpenStyleSheet && (
              <button
                type="button"
                onClick={onOpenStyleSheet}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 hover:bg-white border border-white/75 text-sm text-slate-700 hover:text-slate-900 transition-all duration-150 shadow-sm shadow-sky-100/60"
              >
                <Palette className="w-3.5 h-3.5" />
                自訂樣式
              </button>
            )}
          </div>

          {/* Share + Download buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="w-full bg-white/70 hover:bg-white border border-white/75 text-slate-900 active:scale-[0.96] transition-transform shadow-sm shadow-sky-100/60"
              onClick={onShare}
              disabled={!hasQr}
            >
              {isCopied ? <Check className="w-4 h-4 mr-2 animate-in zoom-in spin-in-12 duration-300" /> : <Share2 className="w-4 h-4 mr-2" />}
              {isCopied ? '已複製' : '分享連結'}
            </Button>
            <Button
              className="w-full bg-white text-black hover:bg-white/90 active:scale-[0.96] transition-transform"
              onClick={onDownload}
              disabled={!hasQr}
            >
              {isDownloaded ? <Check className="w-4 h-4 mr-2 animate-in zoom-in spin-in-12 duration-300" /> : <Download className="w-4 h-4 mr-2" />}
              {isDownloaded ? '已下載' : '下載圖片'}
            </Button>
          </div>
          {copyError && (
            <p className="text-xs text-red-400 text-center">{copyError}</p>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
