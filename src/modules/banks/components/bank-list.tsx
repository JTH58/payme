'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { BankExtended, BankStatus } from '../types';
import { filterBanks } from '../utils/bank-helpers';

const STATUS_ICON: Record<BankStatus, string> = {
  no_reports: '🏦',
  verified: '✅',
  reported_issues: '⚠️',
};

interface BankListProps {
  banks: BankExtended[];
}

export function BankList({ banks }: BankListProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => filterBanks(banks, query), [banks, query]);

  return (
    <div>
      <input
        type="text"
        placeholder="搜尋銀行名稱或代碼..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-3 bg-white/90 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500/50 mb-6"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-12 animate-in fade-in duration-300">
          <Search className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600">查無符合的銀行</p>
          <p className="text-slate-400 text-xs mt-1">請嘗試其他關鍵字</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((bank) => (
            <li key={bank.code}>
              <Link
                href={`/banks/${bank.code}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/80 hover:bg-white border border-slate-200/80 hover:border-slate-300 transition-colors shadow-sm shadow-sky-100/60"
              >
                <span>{STATUS_ICON[bank.status]}</span>
                <span className="text-slate-500 text-sm font-mono">{bank.code}</span>
                <span className="text-slate-900 font-medium">{bank.shortName}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
