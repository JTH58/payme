"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react';
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
import { STORAGE_KEY } from '@/config/storage-keys';
import { safeGetItem, safeSetItem } from '@/lib/safe-storage';
import { HelpDialog } from '@/components/help-dialog';
import { isCryptoAvailable } from '@/lib/crypto';

interface ShareConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareText: string;
  shareUrl: string;
  shortenerMode: ShortenerMode;
  buildEncryptedUrl?: (password: string) => Promise<string>;
  onConfirmShare: (finalUrl: string, passwordUsed: boolean) => void;
}

export function ShareConfirmDialog({
  open,
  onOpenChange,
  shareText,
  shareUrl,
  shortenerMode,
  buildEncryptedUrl,
  onConfirmShare,
}: ShareConfirmDialogProps) {
  const [useShortUrl, setUseShortUrl] = useState(
    () => safeGetItem(STORAGE_KEY.useShortUrl) === 'true'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // Password state
  const [isPasswordEnabled, setIsPasswordEnabled] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [showSharePassword, setShowSharePassword] = useState(false);
  const [encryptionError, setEncryptionError] = useState<string | null>(null);

  const cryptoAvailable = isCryptoAvailable();

  // Cache encrypted URL to avoid re-encrypting on short-url retry
  const encryptedUrlRef = useRef<string | null>(null);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setIsLoading(false);
        setError(null);
        // Reset password state on close
        setIsPasswordEnabled(false);
        setSharePassword('');
        setShowSharePassword(false);
        setEncryptionError(null);
        encryptedUrlRef.current = null;
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  const handleConfirm = useCallback(async () => {
    setEncryptionError(null);
    setError(null);

    const trimmedPassword = sharePassword.trim();
    const passwordUsed = isPasswordEnabled && !!trimmedPassword;

    // Step 1: Determine the URL to share (encrypt if needed)
    let urlToShare = shareUrl;
    if (passwordUsed && buildEncryptedUrl) {
      if (encryptedUrlRef.current) {
        // Use cached encrypted URL (e.g. short-url failed, retrying)
        urlToShare = encryptedUrlRef.current;
      } else {
        try {
          urlToShare = await buildEncryptedUrl(trimmedPassword);
          encryptedUrlRef.current = urlToShare;
        } catch (err) {
          setEncryptionError(err instanceof Error ? err.message : '加密失敗，請重試');
          return;
        }
      }
    }

    // Step 2: Shorten if needed
    if (!useShortUrl) {
      onConfirmShare(urlToShare, passwordUsed);
      handleOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      const shortUrl = await createShortLink(urlToShare, shortenerMode);
      onConfirmShare(shortUrl, passwordUsed);
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立短連結失敗，請重試');
    } finally {
      setIsLoading(false);
    }
  }, [useShortUrl, shareUrl, sharePassword, isPasswordEnabled, buildEncryptedUrl, onConfirmShare, handleOpenChange, shortenerMode]);

  const handleFallback = useCallback(() => {
    const trimmedPassword = sharePassword.trim();
    const passwordUsed = isPasswordEnabled && !!trimmedPassword;
    const urlToShare = encryptedUrlRef.current || shareUrl;
    onConfirmShare(urlToShare, passwordUsed);
    handleOpenChange(false);
  }, [shareUrl, sharePassword, isPasswordEnabled, onConfirmShare, handleOpenChange]);

  const handleEncryptionFallback = useCallback(() => {
    setEncryptionError(null);
    setIsPasswordEnabled(false);
    setSharePassword('');
    encryptedUrlRef.current = null;
    // Share unencrypted
    onConfirmShare(shareUrl, false);
    handleOpenChange(false);
  }, [shareUrl, onConfirmShare, handleOpenChange]);

  const confirmDisabled = isLoading || (isPasswordEnabled && !sharePassword.trim());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分享確認</DialogTitle>
          <DialogDescription>確認分享內容</DialogDescription>
        </DialogHeader>

        {/* TODO: 如何使用暫時隱藏，待 guide 內容完善後恢復
        <button type="button" onClick={() => setHelpOpen(true)} className="text-xs text-blue-400 hover:underline self-start">如何使用？</button>
        */}

        {/* 分享內容預覽 */}
        <div className="bg-muted rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-1">
          <p className="whitespace-pre-wrap text-sm">{shareText}</p>
          <p className="font-mono text-xs break-all text-blue-400">{shareUrl}</p>
        </div>

        {/* Password protection */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              const next = !isPasswordEnabled;
              setIsPasswordEnabled(next);
              if (!next) {
                setSharePassword('');
                setShowSharePassword(false);
                setEncryptionError(null);
                encryptedUrlRef.current = null;
              }
            }}
            disabled={!cryptoAvailable || !buildEncryptedUrl}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg bg-muted border border-border transition-all duration-200 ${(!cryptoAvailable || !buildEncryptedUrl) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4" />
              設定密碼保護
            </span>
            <div className={`w-9 h-5 rounded-full transition-colors duration-200 flex items-center ${isPasswordEnabled ? 'bg-blue-500 justify-end' : 'bg-muted-foreground/30 justify-start'}`}>
              <div className="w-4 h-4 bg-white rounded-full shadow-sm mx-0.5" />
            </div>
          </button>
          {!cryptoAvailable && (
            <p className="text-xs text-destructive/80">您的瀏覽器不支援加密功能</p>
          )}

          {isPasswordEnabled && (
            <div className="relative animate-in slide-in-from-top-1 fade-in duration-200">
              <input
                type={showSharePassword ? 'text' : 'password'}
                value={sharePassword}
                onChange={(e) => {
                  setSharePassword(e.target.value);
                  // Reset cached encrypted URL when password changes
                  encryptedUrlRef.current = null;
                }}
                placeholder="輸入分享密碼"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="h-10 rounded-lg w-full pr-10 pl-3 text-sm outline-none bg-muted border border-border"
              />
              <button
                type="button"
                onClick={() => setShowSharePassword(!showSharePassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showSharePassword ? '隱藏密碼' : '顯示密碼'}
              >
                {showSharePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Encryption error */}
        {encryptionError && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <p className="text-sm text-destructive">{encryptionError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEncryptionFallback}
            >
              以未加密方式分享
            </Button>
          </div>
        )}

        {/* Checkbox: 使用加密短網址 */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-short-url"
              checked={useShortUrl}
              onCheckedChange={(checked) => {
                const val = checked === true;
                setUseShortUrl(val);
                safeSetItem(STORAGE_KEY.useShortUrl, String(val));
              }}
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

        {/* Short URL error */}
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
          <Button onClick={handleConfirm} disabled={confirmDisabled}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            確認分享
          </Button>
        </DialogFooter>
        <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} scenarioId="share-link" />
      </DialogContent>
    </Dialog>
  );
}
