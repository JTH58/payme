'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Palette, Download, Check, Settings, PartyPopper } from 'lucide-react';
import { QrBrandCard } from './qr-brand-card';
import type { QrStyleConfig } from '@/types/qr-style';

interface OnboardingCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrString: string;
  shareUrl: string;
  qrStyle: QrStyleConfig;
  bankName: string;
  accountNumber: string;
  onCustomizeStyle: () => void;
}

export function OnboardingCompleteDialog({
  open,
  onOpenChange,
  qrString,
  shareUrl,
  qrStyle,
  bankName,
  accountNumber,
  onCustomizeStyle,
}: OnboardingCompleteDialogProps) {
  const [revealed, setRevealed] = useState(false);
  const [actionState, setActionState] = useState<'idle' | 'success' | 'error'>('idle');
  const qrRef = useRef<HTMLDivElement>(null);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Staggered reveal on open
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setRevealed(true), 100);
      return () => clearTimeout(timer);
    } else {
      setRevealed(false);
      setActionState('idle');
    }
  }, [open]);

  useEffect(() => {
    return () => clearTimeout(actionTimeoutRef.current);
  }, []);

  const handleDownloadAndCopy = useCallback(async () => {
    try {
      // Download QR image
      if (qrRef.current) {
        const { toPng } = await import('html-to-image');
        const dataUrl = await toPng(qrRef.current, { cacheBust: true });
        const link = document.createElement('a');
        link.download = `payme-tw-qr.png`;
        link.href = dataUrl;
        link.click();
      }

      // Copy share URL
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }

      setActionState('success');
      clearTimeout(actionTimeoutRef.current);
      actionTimeoutRef.current = setTimeout(() => setActionState('idle'), 3000);
    } catch (err) {
      console.warn('下載或複製失敗', err);
      setActionState('error');
      clearTimeout(actionTimeoutRef.current);
      actionTimeoutRef.current = setTimeout(() => setActionState('idle'), 3000);
    }
  }, [shareUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm border-white/10 bg-[#0a0f1e]/95 backdrop-blur-2xl gap-0 overflow-hidden">
        <DialogTitle className="sr-only">收款碼已產生</DialogTitle>
        <DialogDescription className="sr-only">您的專屬收款碼已成功產生</DialogDescription>

        {/* Celebration header */}
        <div className="text-center pt-2 pb-5 space-y-2">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-1 animate-in zoom-in-50 fade-in duration-500"
          >
            <PartyPopper className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-white animate-in fade-in slide-in-from-bottom-2 duration-500">
            恭喜完成！
          </h2>
          <p className="text-sm text-white/50 animate-in fade-in duration-500" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
            您的專屬收款碼已產生
          </p>
        </div>

        {/* QR Card — delayed reveal */}
        <div
          className="flex justify-center pb-5"
          style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'scale(1)' : 'scale(0.9)', transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s' }}
        >
          <div className="relative">
            {/* Glow ring */}
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-blue-500/20 via-purple-500/15 to-emerald-500/20 blur-xl" />
            <QrBrandCard
              ref={qrRef}
              variant="payment"
              qrValue={qrString}
              qrStyle={qrStyle}
              bankName={bankName}
              accountNumber={accountNumber}
            />
          </div>
        </div>

        {/* Action buttons — delayed */}
        <div
          className="space-y-2 pb-4"
          style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(8px)', transition: 'all 0.4s ease-out 0.6s' }}
        >
          <Button
            type="button"
            variant="outline"
            className="w-full border-white/10 hover:border-white/20 hover:bg-white/5 text-white/80 h-11 gap-2"
            onClick={onCustomizeStyle}
          >
            <Palette className="w-4 h-4" />
            客製化您的收款碼
          </Button>
          <Button
            type="button"
            className="w-full h-11 gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium"
            onClick={handleDownloadAndCopy}
          >
            {actionState === 'success' ? (
              <>
                <Check className="w-4 h-4" />
                已下載並複製連結
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                下載收款碼並複製收款連結
              </>
            )}
          </Button>
          {actionState === 'error' && (
            <p className="text-xs text-red-400/80 text-center animate-in fade-in duration-200">
              下載或複製失敗，請再試一次
            </p>
          )}
        </div>

        {/* Tips — delayed */}
        <div
          className="border-t border-white/[0.06] pt-4 pb-1 space-y-2"
          style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.4s ease-out 0.9s' }}
        >
          <div className="flex items-start gap-2 text-[11px] text-white/40 leading-relaxed">
            <Settings className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>如果將來要新增或修改帳戶資訊，可以點擊上方的齒輪。</span>
          </div>
          <div className="flex items-start gap-2 text-[11px] text-white/40 leading-relaxed">
            <Download className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>可以放心關閉此視窗，隨時都可以再下載。</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
