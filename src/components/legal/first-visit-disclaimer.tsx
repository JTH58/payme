"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";
import { STORAGE_KEY as KEYS } from "@/config/storage-keys";

export function FirstVisitDisclaimer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasVisited = safeGetItem(KEYS.hasVisited);
    if (!hasVisited) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAgree = () => {
    safeSetItem(KEYS.hasVisited, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent 
        className="sm:max-w-md bg-[#020617]/90 backdrop-blur-xl border-white/10 shadow-2xl shadow-blue-500/10 p-0 overflow-hidden gap-0 pointer-events-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header Visual */}
        <div className="bg-gradient-to-b from-blue-500/10 to-transparent p-6 pb-4 border-b border-white/5">
           <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-white tracking-tight">安全使用協議</DialogTitle>
                <p className="text-xs text-blue-200/60">Protocol: PUBLIC_TWQR_V1</p>
              </div>
           </div>
        </div>

        <div className="p-6 space-y-5">
           <p className="text-sm text-slate-300 leading-relaxed">
             歡迎使用 PayMe.tw。這是一個<span className="text-white font-medium">純前端 (Client-side)</span> 的開源支付工具。為了保障您的權益，請確認以下事項：
           </p>

            {/* Warning Block */}
            <div className="bg-amber-500/5 p-4 rounded-lg border border-amber-500/10 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50"></div>
               <div className="flex gap-3">
                 <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                 <div className="space-y-1">
                   <h4 className="text-sm font-medium text-amber-500">非官方工具聲明</h4>
                   <p className="text-xs text-amber-200/70 leading-relaxed">
                     本專案與任何銀行或支付機構無關。僅依據財金公司 TWQR 公開規格進行編碼。
                   </p>
                 </div>
               </div>
            </div>

            {/* Security Points */}
            <div className="space-y-3">
               <div className="flex gap-3">
                  <Lock className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-slate-400">
                    <strong className="text-slate-200 block mb-0.5">End-to-End Privacy</strong>
                    您的銀行帳號與交易資料僅在瀏覽器內運算，<span className="text-white border-b border-blue-500/30">絕不傳送至伺服器</span>。
                  </div>
               </div>
               <div className="flex gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-slate-400">
                    <strong className="text-slate-200 block mb-0.5">使用者責任</strong>
                    轉帳前請務必核對 App 顯示的<span className="text-white">戶名與金額</span>，我們不對交易糾紛負責。
                  </div>
               </div>
            </div>
        </div>

        <DialogFooter className="p-6 pt-2 bg-white/[0.02]">
          <Button 
            type="button" 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium h-11 rounded-lg transition-all active:scale-[0.98] border border-blue-400/20 shadow-lg shadow-blue-900/20"
            onClick={handleAgree}
          >
            接受協議並繼續 (Accept Protocol)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
