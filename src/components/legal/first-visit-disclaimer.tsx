"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock, CheckCircle2 } from "lucide-react";

interface FirstVisitDisclaimerProps {
  open: boolean;
  onAccept: () => void;
}

export function FirstVisitDisclaimer({ open, onAccept }: FirstVisitDisclaimerProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md bg-[#020617]/90 backdrop-blur-xl border-white/10 shadow-2xl shadow-blue-500/10 p-0 overflow-hidden gap-0 pointer-events-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="bg-gradient-to-b from-blue-500/10 to-transparent p-6 pb-4 border-b border-white/5">
          <DialogTitle className="text-lg font-semibold text-white tracking-tight">第一次使用提醒</DialogTitle>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-300 leading-relaxed">
            歡迎使用 <span className="text-white font-medium">PayMe.tw</span>。
            <br />
            這是台灣通用開源收款工具。
          </p>
          <p className="text-sm text-slate-400">
            為了保障您的權益，請確認以下事項：
          </p>

          {/* Warning Block */}
          <div className="bg-amber-500/5 p-4 rounded-lg border border-amber-500/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50"></div>
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-500">非官方工具聲明</p>
                <p className="text-xs text-amber-200/70 leading-relaxed">
                  本專案與任何銀行或支付機構無關。僅依據 TWQR 公開規格進行編碼。
                </p>
              </div>
            </div>
          </div>

          {/* Security Points */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <Lock className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-400">
                <strong className="text-slate-200 block mb-0.5">絕對隱私</strong>
                您的銀行帳號與收款資料，僅在您的設備內運算，<span className="text-white border-b border-blue-500/30">絕不傳送至任何伺服器</span>。
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-400">
                <strong className="text-slate-200 block mb-0.5">使用者責任</strong>
                轉帳前請務必核對<span className="text-white">戶名與金額</span>，本網站不對任何交易糾紛負責。
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 bg-white/[0.02]">
          <Button
            type="button"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium h-11 rounded-lg transition-all active:scale-[0.98] border border-blue-400/20 shadow-lg shadow-blue-900/20"
            onClick={onAccept}
          >
            接受並繼續使用 PayMe.tw
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
