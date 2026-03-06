'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { TimeRange, TrendItem, ListResponse } from '../types';
import { useAnalytics } from '../hooks/use-analytics';
import { GlassTooltip } from './glass-tooltip';

interface PageviewTrendProps {
  range: TimeRange;
}

export function PageviewTrend({ range }: PageviewTrendProps) {
  const { data, isLoading } = useAnalytics<ListResponse<TrendItem>>('trend', range);

  if (isLoading) {
    return <div className="h-[300px] bg-white/5 border border-white/10 rounded-xl animate-pulse" />;
  }

  const items = data?.data ?? [];

  if (items.length === 0) {
    return (
      <div className="h-[300px] bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40">
        No data
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h3 className="text-white/60 text-sm mb-4">Pageview Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={items}>
          <defs>
            <linearGradient id="pageviewGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            stroke="rgba(255,255,255,0.3)"
            fontSize={12}
            tickFormatter={(v: string) => range === 'today' ? v.slice(11, 16) : v.slice(5)}
          />
          <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
          <Tooltip content={<GlassTooltip />} />
          <Area
            type="monotone"
            dataKey="pageviews"
            name="Pageviews"
            stroke="#3b82f6"
            fill="url(#pageviewGrad)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="visitors"
            name="Visitors"
            stroke="#22c55e"
            fill="none"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
