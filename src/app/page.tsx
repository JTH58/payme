"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Generator } from "@/components/generator";
import { Zap, AlertTriangle, Download, Trash2 } from "lucide-react";
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { useUrlParser } from '@/hooks/use-url-parser';
import { DecryptionChallenge } from '@/components/decryption-challenge';
import { GridPattern } from '@/components/ui/grid-pattern';
import { FeedbackModal } from '@/components/feedback-modal';
import { BackupDialog } from '@/components/backup-dialog';
import { restoreBackup, hasExistingUserData } from '@/lib/backup';
import { cn } from '@/lib/utils';
import type { BackupPayload } from '@/lib/backup';
import type { CompressedData } from '@/types/bill';
import { STORAGE_KEY } from '@/config/storage-keys';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function BackupImportConfirm({
  backupData,
  onClose,
}: {
  backupData: BackupPayload;
  onClose: () => void;
}) {
  const keyCount = Object.keys(backupData.keys).length;
  const existingData = typeof window !== 'undefined' && hasExistingUserData();
  const backupDate = new Date(backupData.ts).toLocaleString('zh-TW');

  const handleImport = () => {
    restoreBackup(backupData);
    window.location.replace('/');
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>匯入備份資料</DialogTitle>
          <DialogDescription>
            此備份包含 {keyCount} 筆資料，建立於 {backupDate}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {existingData && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-200/70">
                本地已有資料，匯入將覆蓋現有的表單設定和帳戶資料。
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              取消
            </Button>
            <Button className="flex-1 gap-2" onClick={handleImport}>
              <Download className="h-4 w-4" />
              確認匯入
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HomeContent() {
  const { mode, decodedData, isLoading, isEncrypted, encryptedBlob, pathParams, error, isShareLink, isBackupLink, backupData } = useUrlParser();
  const searchParams = useSearchParams();
  const bankCode = searchParams.get('bankCode');
  const [isMounted, setIsMounted] = useState(false);
  const [decryptedData, setDecryptedData] = useState<CompressedData | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isBackupImportOpen, setIsBackupImportOpen] = useState(false);
  const [isQrStyleOpen, setIsQrStyleOpen] = useState(false);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleDecrypted = useCallback((data: CompressedData) => {
    setDecryptedData(data);
  }, []);

  useEffect(() => {
    // 稍微延遲以確保 CSS 已完全載入，避免 FOUC (Flash of Unstyled Content)
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 備份連結自動開啟匯入確認
  useEffect(() => {
    if (isBackupLink && backupData) {
      setIsBackupImportOpen(true);
    }
  }, [isBackupLink, backupData]);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden selection:bg-blue-500/30">

      {/* 0. The Curtain (Loading Overlay) - 解決閃爍問題的核心 */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-[#020617] flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out", // z-[60] = Z_INDEX.LOADING_CURTAIN — 需在 Navbar(z-50) 之上
          isMounted ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-splash-128.png" alt="PayMe.tw" className="w-16 h-16 rounded-2xl animate-bounce" width={64} height={64} />
          <p className="text-white/40 tracking-[0.2em] text-sm font-medium uppercase animate-pulse">Loading PayMe.tw</p>
        </div>
      </div>

      {/* 1. Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#020617] to-[#0b1121]"></div>
        <GridPattern
          width={50}
          height={50}
          x={-1}
          y={-1}
          className="stroke-white/[0.03] [mask-image:linear-gradient(to_bottom,white,transparent_80%)]"
        />
        {/* Subtle Glow */}
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
      </div>

      {/* 2. Navbar - Safe Area Adapted */}
      <Navbar
        className={cn(
          "transition-all duration-1000 transform translate-y-0 opacity-100",
          !isMounted && "-translate-y-4 opacity-0"
        )}
        onBackupClick={() => setIsBackupOpen(true)}
        onQrStyleClick={() => setIsQrStyleOpen(true)}
        onAccountClick={() => setIsAccountSheetOpen(true)}
        onResetAllClick={() => setIsResetConfirmOpen(true)}
      />

      <main className="relative z-10 flex-1 flex flex-col items-center w-full max-w-7xl mx-auto px-4 pt-12 md:pt-20 pb-20">

        {/* 3. Hero Section - T+200ms Entry */}
        <header className={cn(
          "flex flex-col items-center text-center space-y-6 mb-12 transition-all duration-1000 delay-200 transform",
          isMounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        )}>

          {/* Main Title */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 pb-2">
              台灣TWQR • 通用收款/分帳工具
            </h1>
            <div className="text-sm text-white/40 max-w-lg mx-auto grid grid-cols-2 sm:grid-cols-3 gap-x-3 sm:gap-x-6 gap-y-1">
              <span>• 符合 TWQR 規則</span>
              <span>• 本地運算不上傳</span>
              <span>• 支援多帳戶分享</span>
              <span>• 輕鬆收款／分帳</span>
              <span>• 公開專案原始碼</span>
              <span>• 支援台灣各銀行</span>
            </div>
          </div>

        </header>

        {/* 4a. Share Link Error Banner */}
        {error && isShareLink && (
          <div className={cn(
            "w-full max-w-2xl mb-8 transition-all duration-1000 delay-400 transform",
            isMounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          )}>
            <div className="glass-panel rounded-2xl border border-red-500/20 border-l-4 border-l-red-500/60 p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={22} />
                <div className="space-y-2">
                  <p className="text-white/90 font-medium">連結無法開啟</p>
                  <p className="text-white/50 text-sm leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4b. The Generator (Center Stage) - T+400ms Entry */}
        <div className={cn(
          "w-full max-w-5xl transition-all duration-1000 delay-500 transform",
          isMounted ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
        )}>
          <Suspense fallback={
            <div className="w-full max-w-4xl h-[500px] mx-auto flex flex-col gap-4 items-center justify-center text-white/30 glass-panel rounded-3xl border border-white/5">
              <Zap className="animate-pulse" size={32} />
              <span className="text-sm tracking-widest uppercase">Loading App...</span>
            </div>
          }>
            {isEncrypted && !decryptedData ? (
              <DecryptionChallenge
                encryptedBlob={encryptedBlob!}
                mode={mode}
                pathParams={pathParams}
                onDecrypted={handleDecrypted}
              />
            ) : error && isShareLink ? (
              <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center gap-6 py-16">
                <p className="text-white/40 text-sm">或者，你可以建立自己的收款碼</p>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors font-medium text-sm"
                >
                  建立我的收款碼
                </a>
              </div>
            ) : (
              <Generator
                initialMode={mode}
                initialData={decryptedData || decodedData}
                isShared={!!(decryptedData || decodedData)}
                initialBankCode={bankCode}
                qrStyleSheetOpen={isQrStyleOpen}
                onQrStyleSheetOpenChange={setIsQrStyleOpen}
                accountSheetOpen={isAccountSheetOpen}
                onAccountSheetOpenChange={setIsAccountSheetOpen}
              />
            )}
          </Suspense>
        </div>

      </main>

      {/* 5. Footer - Safe Area Adapted */}
      <Footer
        className={cn(
          "relative z-10 backdrop-blur-xl transition-all duration-1000 delay-700",
          isMounted ? "opacity-100" : "opacity-0"
        )}
        onFeedbackClick={() => setIsFeedbackOpen(true)}
      />

      {/* Global Modals - Loaded but hidden until interactions */}
      <FeedbackModal open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
      <BackupDialog open={isBackupOpen} onOpenChange={setIsBackupOpen} />
      {/* 備份連結匯入確認 Dialog */}
      {isBackupImportOpen && backupData && (
        <BackupImportConfirm
          backupData={backupData}
          onClose={() => setIsBackupImportOpen(false)}
        />
      )}

      {/* 重置所有資料確認 Dialog */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="sm:max-w-md border-red-500/20">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <Trash2 className="h-6 w-6" />
              <DialogTitle className="text-xl">重置所有資料</DialogTitle>
            </div>
            <DialogDescription className="text-left pt-2 text-base text-muted-foreground">
              此操作將清除所有本地儲存的資料，包括帳戶設定、表單內容、QR 樣式偏好等。此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setIsResetConfirmOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                Object.values(STORAGE_KEY).forEach(k => localStorage.removeItem(k));
                window.location.reload();
              }}
            >
              確定刪除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-splash-128.png" alt="PayMe.tw" className="w-16 h-16 rounded-2xl animate-bounce" width={64} height={64} />
          <p className="text-white/40 tracking-[0.2em] text-sm font-medium uppercase animate-pulse">
            Loading PayMe.tw
          </p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
