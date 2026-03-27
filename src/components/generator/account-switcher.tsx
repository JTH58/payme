import React, { useMemo } from 'react';
import { CompactAccount } from '@/types/bill';
import banks from '@/data/banks.json';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface AccountSwitcherProps {
  accounts: CompactAccount[];
  currentBankCode: string;
  currentAccountNumber: string;
  onSelect: (bankCode: string, accountNumber: string) => void;
}

export function AccountSwitcher({ 
  accounts, 
  currentBankCode, 
  currentAccountNumber,
  onSelect 
}: AccountSwitcherProps) {
  const shortNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of banks) {
      map.set(b.code, b.name.replace('商業銀行', '').replace('銀行', ''));
    }
    return map;
  }, []);

  if (!accounts || accounts.length <= 1) return null;

  return (
    <div className="w-full space-y-2 mb-6">
       <div className="text-xs text-slate-500 text-center" id="account-switcher-label">選擇轉入帳戶</div>
       <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-labelledby="account-switcher-label">
          {accounts.map((acc) => {
             const bankName = shortNameMap.get(acc.b) || acc.b;
             const isSelected = acc.b === currentBankCode && acc.a === currentAccountNumber;

             return (
               <button
                 key={`${acc.b}-${acc.a}`}
                 role="radio"
                 aria-checked={isSelected}
                 onClick={() => onSelect(acc.b, acc.a)}
                 className={cn(
                   "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all active:scale-[0.98]",
                   isSelected
                     ? "bg-blue-100 border-blue-300 text-blue-800 shadow-sm shadow-blue-100"
                     : "bg-white/80 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300"
                 )}
               >
                 <span className="font-bold">{bankName}</span>
                 <span className="font-mono text-xs opacity-70">*{acc.a.slice(-4)}</span>
                 {isSelected && <Check size={14} className="text-blue-600" />}
               </button>
             );
          })}
       </div>
    </div>
  );
}
