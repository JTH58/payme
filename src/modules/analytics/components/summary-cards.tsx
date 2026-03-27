'use client';

import { Eye, Users, MousePointerClick, TrendingUp } from 'lucide-react';
import type { SummaryData, TimeRange } from '../types';
import { useAnalytics } from '../hooks/use-analytics';

const CARDS = [
  { key: 'totalPageviews' as const, label: 'Pageviews', icon: Eye, color: 'text-blue-400' },
  { key: 'uniqueVisitors' as const, label: 'Visitors', icon: Users, color: 'text-green-400' },
  { key: 'totalEvents' as const, label: 'Events', icon: MousePointerClick, color: 'text-purple-400' },
  { key: 'avgDailyPageviews' as const, label: 'Avg/Day', icon: TrendingUp, color: 'text-cyan-400' },
];

interface SummaryCardsProps {
  range: TimeRange;
}

export function SummaryCards({ range }: SummaryCardsProps) {
  const { data, isLoading } = useAnalytics<SummaryData>('summary', range);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className="marketing-card p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${color}`} />
            <span className="text-slate-500 text-sm">{label}</span>
          </div>
          {isLoading ? (
            <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-slate-900">
              {(data?.[key] ?? 0).toLocaleString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
