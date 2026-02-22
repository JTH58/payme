"use client";

import React, { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createShortLink, type ShortenerMode } from '@/lib/shortener-api';

interface ShareConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareText: string;
  shareUrl: string;
  passwordHint: string;
  shortenerMode: ShortenerMode;
  onConfirmShare: (finalUrl: string) => void;
}

export function ShareConfirmDialog({
  open,
  onOpenChange,
  shareText,
  shareUrl,
  passwordHint,
  shortenerMode,
  onConfirmShare,
}: ShareConfirmDialogProps) {
  const [useShortUrl, setUseShortUrl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setUseShortUrl(false);
        setIsLoading(false);
        setError(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  const handleConfirm = useCallback(async () => {
    if (!useShortUrl) {
      onConfirmShare(shareUrl);
      handleOpenChange(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const shortUrl = await createShortLink(shareUrl, shortenerMode);
      onConfirmShare(shortUrl);
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立短連結失敗，請重試');
    } finally {
      setIsLoading(false);
    }
  }, [useShortUrl, shareUrl, onConfirmShare, handleOpenChange]);

  const handleFallback = useCallback(() => {
    onConfirmShare(shareUrl);
    handleOpenChange(false);
  }, [shareUrl, onConfirmShare, handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分享確認</DialogTitle>
          <DialogDescription>確認分享內容</DialogDescription>
        </DialogHeader>

        {/* 分享內容預覽 */}
        <div className="bg-muted rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-1">
          <p className="whitespace-pre-wrap text-sm">{shareText}</p>
          {passwordHint && (
            <p className="text-sm text-orange-400">{passwordHint}</p>
          )}
          <p className="font-mono text-xs break-all text-blue-400">{shareUrl}</p>
        </div>

        {/* Checkbox: 使用加密短網址 */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-short-url"
              checked={useShortUrl}
              onCheckedChange={(checked) => setUseShortUrl(checked === true)}
              disabled={isLoading}
            />
            <Label htmlFor="use-short-url" className="text-sm cursor-pointer">
              使用限時加密短網址
            </Label>
          </div>

          {useShortUrl && (
            <div className="text-xs text-muted-foreground pl-6 animate-in fade-in slide-in-from-top-1 duration-200 space-y-0.5">
              <p>・連結將加密為短網址</p>
              <p>・內容將暫存 12 小時後自動銷毀</p>
              <p>・AES-256-GCM 加密演算法</p>
              <p>・內容連伺服器本身都解不開</p>
              <a
                href="https://s.payme.tw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline inline-block mt-1"
              >
                了解更多 →
              </a>
            </div>
          )}
        </div>

        {/* Error 區塊 */}
        {error && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFallback}
            >
              使用完整網址分享
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            確認分享
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
