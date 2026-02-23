'use client';

import { useState, useCallback } from 'react';
import { Download, Upload, Copy, Check, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  createBackupPayload,
  compressBackup,
  decompressBackup,
  buildBackupUrl,
  restoreBackup,
  hasExistingUserData,
} from '@/lib/backup';
import { HelpDialog } from '@/components/help-dialog';

interface BackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackupDialog({ open, onOpenChange }: BackupDialogProps) {
  const [textValue, setTextValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<ReturnType<typeof decompressBackup>>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleCopyLink = useCallback(async () => {
    const payload = createBackupPayload();
    if (Object.keys(payload.keys).length === 0) {
      setImportError('目前沒有任何資料可以匯出');
      return;
    }
    const url = buildBackupUrl(payload);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setImportError(null);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleExportText = useCallback(() => {
    const payload = createBackupPayload();
    if (Object.keys(payload.keys).length === 0) {
      setImportError('目前沒有任何資料可以匯出');
      return;
    }
    const compressed = compressBackup(payload);
    setTextValue(compressed);
    setImportError(null);
  }, []);

  const doRestore = useCallback((payload: NonNullable<ReturnType<typeof decompressBackup>>) => {
    restoreBackup(payload);
    window.location.replace('/');
  }, []);

  const handleImportText = useCallback(() => {
    const trimmed = textValue.trim();
    if (!trimmed) {
      setImportError('請先貼上備份文字');
      return;
    }
    const payload = decompressBackup(trimmed);
    if (!payload) {
      setImportError('備份資料無效或已損毀');
      return;
    }
    setImportError(null);
    if (hasExistingUserData()) {
      setPendingPayload(payload);
      setConfirmOverwrite(true);
    } else {
      doRestore(payload);
    }
  }, [textValue, doRestore]);

  const handleConfirmOverwrite = useCallback(() => {
    if (pendingPayload) {
      doRestore(pendingPayload);
    }
  }, [pendingPayload, doRestore]);

  const handleCancelOverwrite = useCallback(() => {
    setConfirmOverwrite(false);
    setPendingPayload(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>備份與轉移</DialogTitle>
          <DialogDescription>
            匯出你的資料到其他裝置，或從備份還原。
          </DialogDescription>
        </DialogHeader>

        <button type="button" onClick={() => setHelpOpen(true)} className="text-xs text-blue-400 hover:underline self-start">如何使用？</button>

        {confirmOverwrite ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-200">本地已有資料</p>
                <p className="text-yellow-200/70 mt-1">
                  匯入將覆蓋現有的表單設定和帳戶資料。此操作無法還原。
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCancelOverwrite}>
                取消
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleConfirmOverwrite}>
                確認覆蓋
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 匯出連結 */}
            <div>
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="w-full justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 animate-in zoom-in spin-in-12 duration-300" />
                    已複製匯出連結
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    複製匯出連結
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">
                在其他裝置開啟連結即可匯入資料
              </p>
            </div>

            {/* 分隔線 */}
            <div className="flex items-center gap-3">
              <div className="border-t border-white/10 flex-1" />
              <span className="text-white/20 text-xs">或使用文字備份</span>
              <div className="border-t border-white/10 flex-1" />
            </div>

            {/* 文字備份區 */}
            <div className="space-y-3">
              <textarea
                value={textValue}
                onChange={(e) => {
                  setTextValue(e.target.value);
                  setImportError(null);
                }}
                placeholder="點擊「產生備份」取得文字，或貼上之前的備份文字"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none"
                aria-label="備份文字"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleExportText}
                >
                  <Download className="h-4 w-4" />
                  產生備份
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleImportText}
                >
                  <Upload className="h-4 w-4" />
                  匯入
                </Button>
              </div>
            </div>

            {/* Error */}
            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}
          </div>
        )}
        <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} scenarioId="backup" />
      </DialogContent>
    </Dialog>
  );
}
