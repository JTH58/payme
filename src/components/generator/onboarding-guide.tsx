'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronDown, Wallet, QrCode } from 'lucide-react';

interface OnboardingGuideProps {
  onOpenAccountSheet: () => void;
  onGenerateQr: () => void;
  isAccountReady: boolean;
}

export function OnboardingGuide({ onOpenAccountSheet, onGenerateQr, isAccountReady }: OnboardingGuideProps) {
  const [showStep1Hint, setShowStep1Hint] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 shadow-sm shadow-sky-100/80 p-6 space-y-5">
      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">PayMe.TW 快速上手！</h2>
        <p className="text-sm text-slate-600">兩步驟擁有個人專屬收款碼</p>
      </div>

      {/* Step 1 */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 font-medium tracking-wider">STEP 1</p>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 h-12 px-4"
          onClick={onOpenAccountSheet}
        >
          <span className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            設定帳戶資訊
          </span>
          {isAccountReady && (
            <CheckCircle className="w-5 h-5 text-emerald-400 animate-in zoom-in-50 fade-in duration-300" />
          )}
        </Button>
      </div>

      {/* Flow Arrow */}
      <div className="flex justify-center">
        <ChevronDown className="w-5 h-5 text-slate-400 animate-flow-down" />
      </div>

      {/* Step 2 */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 font-medium tracking-wider">STEP 2</p>
        <Button
          type="button"
          className="w-full h-12 gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium disabled:opacity-40"
          disabled={!isAccountReady}
          onClick={() => {
            if (!isAccountReady) {
              setShowStep1Hint(true);
              setTimeout(() => setShowStep1Hint(false), 3000);
              return;
            }
            onGenerateQr();
          }}
        >
          <QrCode className="w-4 h-4" />
          產生專屬收款碼
        </Button>
        {showStep1Hint && !isAccountReady && (
          <p className="text-xs text-amber-400/80 text-center animate-in fade-in slide-in-from-top-1 duration-200">
            請先完成步驟 1，設定帳戶資訊
          </p>
        )}
      </div>
    </div>
  );
}
