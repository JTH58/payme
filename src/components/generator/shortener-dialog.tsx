"use client";

import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SHORTENER_SERVICES = [
  { name: 'reurl.cc', url: 'https://reurl.cc/main/tw', label: 'reurl.cc' },
  { name: 'myppt.cc', url: 'https://myppt.cc/', label: 'myppt.cc' },
  { name: 'ppt.cc', url: 'https://ppt.cc/', label: 'ppt.cc' },
] as const;

interface ShortenerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
}

export function ShortenerDialog({ open, onOpenChange, shareUrl }: ShortenerDialogProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // execCommand fallback
      try {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (successful) {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        } else {
          throw new Error('execCommand failed');
        }
      } catch {
        setCopyError('複製失敗，請手動選取網址');
        setTimeout(() => setCopyError(''), 3000);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>縮網址服務</DialogTitle>
          <DialogDescription>
            選擇以下縮網址服務，將長連結轉為短連結方便分享
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Full URL display + copy */}
          <div className="flex items-center gap-2">
            <div className="flex-1 p-2 bg-muted rounded-md overflow-x-auto">
              <p className="text-xs font-mono break-all">{shareUrl}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!shareUrl}
              onClick={handleCopy}
              className="shrink-0"
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 mr-1 animate-in zoom-in spin-in-12 duration-300" />
                  已複製
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  複製
                </>
              )}
            </Button>
          </div>
          {copyError && (
            <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200">{copyError}</p>
          )}

          {/* Shortener links */}
          <div className="space-y-2">
            {SHORTENER_SERVICES.map((service) => (
              <a
                key={service.name}
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between w-full p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <span className="text-sm font-medium">{service.label}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform duration-150" />
              </a>
            ))}
          </div>

          {/* Privacy notice */}
          <p className="text-xs text-muted-foreground">
            以上為第三方縮網址服務，PayMe.TW 不保證其隱私政策與服務可用性。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
