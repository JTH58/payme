'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Palette, Download, Check, Settings, PartyPopper, Loader2 } from 'lucide-react';
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
  const [qrReady, setQrReady] = useState(false);
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
      setQrReady(false);
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
      <DialogContent className="sm:max-w-sm border-white/10 bg-[#0a0f1e]/95 backdrop-blur-2xl gap-0 overflow-y-auto max-h-[calc(100vh-2rem)] [&>button]:opacity-100 [&>button]:bg-white/10 [&>button]:rounded-full [&>button]:text-white/70 [&>button]:hover:text-white [&>button]:hover:bg-white/20">
        <DialogTitle className="sr-only">收款碼已產生</DialogTitle>
        <DialogDescription className="sr-only">您的專屬收款碼已成功產生</DialogDescription>

        {/* Celebration header — icon + title on one line */}
        <div className="flex items-center justify-center gap-3 pt-2 pb-4 animate-in fade-in duration-500">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
            <PartyPopper className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">恭喜完成！</h2>
        </div>

        {/* QR Card — delayed reveal */}
        <div
          className="flex justify-center pb-4"
          style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'scale(1)' : 'scale(0.9)', transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s' }}
        >
          <div className="relative">
            {/* Glow ring */}
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-blue-500/20 via-purple-500/15 to-emerald-500/20 blur-xl" />
            {/* Loading overlay */}
            {!qrReady && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            )}
            <QrBrandCard
              ref={qrRef}
              variant="payment"
              qrValue={qrString}
              qrStyle={qrStyle}
              bankName={bankName}
              accountNumber={accountNumber}
              onQrReady={() => setQrReady(true)}
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
            disabled={!qrReady}
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

        {/* Tip — delayed */}
        <div
          className="border-t border-white/[0.06] pt-3 pb-1"
          style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.4s ease-out 0.9s' }}
        >
          <div className="flex items-start gap-2 text-[11px] text-white/40 leading-relaxed">
            <Settings className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>欲新增更多帳戶，可至首頁點擊上方齒輪</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
