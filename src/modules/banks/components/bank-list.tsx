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
        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50 mb-6"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-12 animate-in fade-in duration-300">
          <Search className="h-10 w-10 mx-auto text-white/20 mb-3" />
          <p className="text-white/50">查無符合的銀行</p>
          <p className="text-white/30 text-xs mt-1">請嘗試其他關鍵字</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((bank) => (
            <li key={bank.code}>
              <Link
                href={`/banks/${bank.code}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-colors"
              >
                <span>{STATUS_ICON[bank.status]}</span>
                <span className="text-white/50 text-sm font-mono">{bank.code}</span>
                <span className="text-white font-medium">{bank.shortName}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
