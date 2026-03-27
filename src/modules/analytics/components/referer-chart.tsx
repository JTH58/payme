'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { TimeRange, NameValueItem, ListResponse } from '../types';
import { useAnalytics } from '../hooks/use-analytics';
import { GlassTooltip } from './glass-tooltip';

interface RefererChartProps {
  range: TimeRange;
}

export function RefererChart({ range }: RefererChartProps) {
  const { data, isLoading } = useAnalytics<ListResponse<NameValueItem>>('referers', range);

  if (isLoading) {
    return <div className="h-[300px] marketing-card animate-pulse" />;
  }

  const items = data?.data ?? [];

  if (items.length === 0) {
    return (
      <div className="h-[300px] marketing-card flex items-center justify-center text-slate-400">
        No referrer data
      </div>
    );
  }

  return (
    <div className="marketing-card p-4">
      <h3 className="text-slate-500 text-sm mb-4">Top Referrers</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, items.length * 36)}>
        <BarChart data={items} layout="vertical">
          <XAxis type="number" stroke="rgba(100,116,139,0.8)" fontSize={12} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="rgba(100,116,139,0.8)"
            fontSize={12}
            width={120}
          />
          <Tooltip content={<GlassTooltip />} />
          <Bar dataKey="value" name="Visits" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
