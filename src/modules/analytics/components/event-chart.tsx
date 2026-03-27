'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { TimeRange, NameValueItem, ListResponse } from '../types';
import { useAnalytics } from '../hooks/use-analytics';
import { GlassTooltip } from './glass-tooltip';

interface EventChartProps {
  range: TimeRange;
}

export function EventChart({ range }: EventChartProps) {
  const { data, isLoading } = useAnalytics<ListResponse<NameValueItem>>('events', range);

  if (isLoading) {
    return <div className="h-[300px] marketing-card animate-pulse" />;
  }

  const items = data?.data ?? [];

  if (items.length === 0) {
    return (
      <div className="h-[300px] marketing-card flex items-center justify-center text-slate-400">
        No events
      </div>
    );
  }

  return (
    <div className="marketing-card p-4">
      <h3 className="text-slate-500 text-sm mb-4">Events</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={items}>
          <XAxis dataKey="name" stroke="rgba(100,116,139,0.8)" fontSize={11} />
          <YAxis stroke="rgba(100,116,139,0.8)" fontSize={12} />
          <Tooltip content={<GlassTooltip />} />
          <Bar dataKey="value" name="Count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
