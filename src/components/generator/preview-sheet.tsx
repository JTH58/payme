import React, { useRef, useCallback } from 'react';
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
import { AccountSwitcher } from './account-switcher';
import { QrBrandCard } from './qr-brand-card';
import {
  Share2, Check, Download, Lock, Eye, EyeOff,
} from 'lucide-react';
import { isCryptoAvailable } from '@/lib/crypto';

interface PreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<TwqrFormValues>;
  subMode: FormSubMode;
  // QR data
  qrString: string;
  currentShareUrl: string;
  // Account switching
  sharedAccounts?: CompactAccount[];
  onAccountSwitch?: (bankCode: string, accountNumber: string) => void;
  // Bill info (itemized mode — for QrBrandCard share variant)
  billTitle?: string;
  memberCount?: number;
  // Branding info
  currentBankName: string;
  // Password
  isPasswordEnabled: boolean;
  sharePassword: string;
  showSharePassword: boolean;
  onPasswordToggle: () => void;
  onPasswordChange: (pw: string) => void;
  onToggleShowPassword: () => void;
  // Actions
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
  sharedAccounts,
  onAccountSwitch,
  billTitle,
  memberCount,
  currentBankName,
  isPasswordEnabled,
  sharePassword,
  showSharePassword,
  onPasswordToggle,
  onPasswordChange,
  onToggleShowPassword,
  onShare,
  onDownload,
  isCopied,
  isDownloaded,
  copyError,
  qrCardRef,
}: PreviewSheetProps) {
  const cryptoAvailable = isCryptoAvailable();
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
                  <span className="text-xs">
                    {!form.watch('bankCode') || !form.watch('accountNumber')
                      ? '⚠️ 缺少銀行帳號'
                      : '等待輸入...'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Password protection */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={onPasswordToggle}
              disabled={!cryptoAvailable}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 ${!cryptoAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="flex items-center gap-2 text-sm text-white/70">
                <Lock className="h-4 w-4" />
                設定密碼保護
              </span>
              <div className={`w-9 h-5 rounded-full transition-colors duration-200 flex items-center ${isPasswordEnabled ? 'bg-blue-500 justify-end' : 'bg-white/20 justify-start'}`}>
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
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder="輸入分享密碼"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="glass-input h-10 rounded-lg w-full pr-10 pl-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={onToggleShowPassword}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  tabIndex={-1}
                  aria-label={showSharePassword ? '隱藏密碼' : '顯示密碼'}
                >
                  {showSharePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Share + Download buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="w-full bg-white/10 hover:bg-white/20 border-white/10 text-white active:scale-[0.96] transition-transform"
              onClick={onShare}
              disabled={!hasQr || (isPasswordEnabled && !sharePassword.trim())}
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
