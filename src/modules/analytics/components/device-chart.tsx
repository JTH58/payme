'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { TimeRange, NameValueItem, ListResponse } from '../types';
import { useAnalytics } from '../hooks/use-analytics';
import { GlassTooltip } from './glass-tooltip';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4'];

interface DeviceChartProps {
  range: TimeRange;
}

export function DeviceChart({ range }: DeviceChartProps) {
  const { data, isLoading } = useAnalytics<ListResponse<NameValueItem>>('devices', range);

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
      <h3 className="text-slate-500 text-sm mb-4">Devices</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={items}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            dataKey="value"
            nameKey="name"
            stroke="none"
          >
            {items.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<GlassTooltip />} />
          <Legend
            formatter={(value: string) => <span className="text-slate-600 text-sm">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
