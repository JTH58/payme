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
    return <div className="h-[300px] bg-white/5 border border-white/10 rounded-xl animate-pulse" />;
  }

  const items = data?.data ?? [];

  if (items.length === 0) {
    return (
      <div className="h-[300px] bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40">
        No events
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h3 className="text-white/60 text-sm mb-4">Events</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={items}>
          <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} />
          <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
          <Tooltip content={<GlassTooltip />} />
          <Bar dataKey="value" name="Count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
