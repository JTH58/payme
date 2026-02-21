"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Generator } from "@/components/generator";
import { ShieldCheck, Zap, AlertTriangle, Download } from "lucide-react";
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { FirstVisitDisclaimer } from '@/components/legal/first-visit-disclaimer';
import { useUrlParser } from '@/hooks/use-url-parser';
import { DecryptionChallenge } from '@/components/decryption-challenge';
import { GridPattern } from '@/components/ui/grid-pattern';
import { FeedbackModal } from '@/components/feedback-modal';
import { BackupDialog } from '@/components/backup-dialog';
import { restoreBackup, hasExistingUserData } from '@/lib/backup';
import { cn } from '@/lib/utils';
import type { BackupPayload } from '@/lib/backup';
import type { CompressedData } from '@/types/bill';
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
          <div className="w-16 h-16 bg-white/5 rounded-2xl animate-bounce backdrop-blur-md border border-white/10 flex items-center justify-center">
            <div className="w-8 h-8 bg-blue-500/50 rounded-full blur-lg"></div>
          </div>
          <p className="text-white/40 tracking-[0.2em] text-xs font-medium uppercase animate-pulse">Initializing PayMe</p>
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
      />

      <main className="relative z-10 flex-1 flex flex-col items-center w-full max-w-7xl mx-auto px-4 pt-12 md:pt-20 pb-20">

        {/* 3. Hero Section - T+200ms Entry */}
        <header className={cn(
          "flex flex-col items-center text-center space-y-6 mb-12 transition-all duration-1000 delay-200 transform",
          isMounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        )}>

          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium backdrop-blur-sm">
            <ShieldCheck size={12} />
            <span>Privacy First • TWQR Supported • Open Source</span>
          </div>

          {/* Main Title */}
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 pb-2">
              PayMe • 台灣通用<br className="md:hidden" />收款碼
            </h1>
            <p className="text-lg md:text-xl text-white/40 max-w-xl mx-auto leading-relaxed">
              由使用者瀏覽器直接運算，<span className="text-white/70">資料不回傳</span>。
              <br className="hidden md:block" />
              支援所有採用 TWQR 格式的銀行，讓轉帳變得優雅的隱私工具。
            </p>
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
      <FirstVisitDisclaimer />

      {/* 備份連結匯入確認 Dialog */}
      {isBackupImportOpen && backupData && (
        <BackupImportConfirm
          backupData={backupData}
          onClose={() => setIsBackupImportOpen(false)}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <p className="text-white/40 tracking-[0.2em] text-xs font-medium uppercase animate-pulse">Initializing PayMe</p>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
