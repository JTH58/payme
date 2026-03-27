'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { TimeRange, NameValueItem, ListResponse } from '../types';
import { useAnalytics } from '../hooks/use-analytics';
import { GlassTooltip } from './glass-tooltip';

const BROWSER_COLORS: Record<string, string> = {
  Chrome: '#4285F4',
  Safari: '#006CFF',
  Firefox: '#FF7139',
  Edge: '#0078D4',
  Opera: '#FF1B2D',
  unknown: '#6b7280',
};

interface BrowserChartProps {
  range: TimeRange;
}

export function BrowserChart({ range }: BrowserChartProps) {
  const { data, isLoading } = useAnalytics<ListResponse<NameValueItem>>('browsers', range);

  if (isLoading) {
    return <div className="h-[300px] marketing-card animate-pulse" />;
  }

  const items = data?.data ?? [];

  if (items.length === 0) {
    return (
      <div className="h-[300px] marketing-card flex items-center justify-center text-slate-400">
        No data
      </div>
    );
  }

  return (
    <div className="marketing-card p-4">
      <h3 className="text-slate-500 text-sm mb-4">Browsers</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={items}>
          <XAxis dataKey="name" stroke="rgba(100,116,139,0.8)" fontSize={12} />
          <YAxis stroke="rgba(100,116,139,0.8)" fontSize={12} />
          <Tooltip content={<GlassTooltip />} />
          <Bar dataKey="value" name="Views" radius={[4, 4, 0, 0]}>
            {items.map((item, i) => (
              <Cell key={i} fill={BROWSER_COLORS[item.name] ?? BROWSER_COLORS.unknown} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
